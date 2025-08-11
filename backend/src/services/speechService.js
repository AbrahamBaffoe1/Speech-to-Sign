const speech = require('@google-cloud/speech');
const { OpenAI } = require('openai');
const fs = require('fs');
const path = require('path');
const { logger } = require('../utils/logger');

class SpeechService {
  constructor() {
    this.googleClient = null;
    this.openaiClient = null;
    
    // Initialize Google Cloud Speech if credentials are available
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      try {
        this.googleClient = new speech.SpeechClient();
        logger.info('Google Cloud Speech client initialized');
      } catch (error) {
        logger.warn('Failed to initialize Google Cloud Speech client:', error.message);
      }
    }
    
    // Initialize OpenAI if API key is available
    if (process.env.OPENAI_API_KEY) {
      try {
        this.openaiClient = new OpenAI({
          apiKey: process.env.OPENAI_API_KEY,
        });
        logger.info('OpenAI client initialized');
      } catch (error) {
        logger.warn('Failed to initialize OpenAI client:', error.message);
      }
    }
  }

  async transcribeAudio(audioBuffer, options = {}) {
    const startTime = Date.now();
    
    try {
      // Try Google Cloud Speech first
      if (this.googleClient) {
        const result = await this.transcribeWithGoogle(audioBuffer, options);
        const processingTime = Date.now() - startTime;
        logger.info(`Google transcription completed in ${processingTime}ms`);
        return result;
      }
      
      // Fallback to OpenAI Whisper
      if (this.openaiClient) {
        const result = await this.transcribeWithOpenAI(audioBuffer, options);
        const processingTime = Date.now() - startTime;
        logger.info(`OpenAI transcription completed in ${processingTime}ms`);
        return result;
      }
      
      throw new Error('No speech recognition service configured');
    } catch (error) {
      logger.error('Transcription failed:', error);
      throw error;
    }
  }


  async transcribeWithGoogle(audioBuffer, options = {}) {
    const { AppError, ERROR_TYPES } = require('../utils/errors');
    
    if (!this.googleClient) {
      throw new AppError(
        'Google Cloud Speech client not initialized',
        500,
        ERROR_TYPES.SPEECH_SERVICE_UNAVAILABLE
      );
    }

    try {
      // Validate audio buffer
      if (!audioBuffer || audioBuffer.length === 0) {
        throw new AppError(
          'Empty audio buffer provided',
          400,
          ERROR_TYPES.SPEECH_NO_AUDIO_DETECTED
        );
      }

      // Check audio size (Google Cloud has limits)
      const maxSizeBytes = 10 * 1024 * 1024; // 10MB
      if (audioBuffer.length > maxSizeBytes) {
        throw new AppError(
          'Audio file too large',
          400,
          ERROR_TYPES.SPEECH_AUDIO_TOO_LARGE
        );
      }

      const audio = {
        content: audioBuffer.toString('base64'),
      };

      const config = {
        encoding: options.encoding || 'WEBM_OPUS',
        sampleRateHertz: options.sampleRate || 48000,
        languageCode: options.languageCode || 'en-US',
        enableAutomaticPunctuation: true,
        enableWordTimeOffsets: false,
        model: 'latest_short', // Optimized for short utterances
        useEnhanced: true,
        maxAlternatives: 1,
      };

      const request = {
        audio: audio,
        config: config,
      };

      logger.info('Sending request to Google Cloud Speech', {
        audioSize: audioBuffer.length,
        language: config.languageCode
      });

      const [response] = await this.googleClient.recognize(request);
      
      if (!response || !response.results || response.results.length === 0) {
        throw new AppError(
          'No speech detected in audio',
          400,
          ERROR_TYPES.SPEECH_NO_AUDIO_DETECTED
        );
      }

      const transcription = response.results
        .map(result => result.alternatives[0].transcript)
        .join(' ');

      if (!transcription || transcription.trim() === '') {
        throw new AppError(
          'No transcribable speech found',
          400,
          ERROR_TYPES.SPEECH_NO_AUDIO_DETECTED
        );
      }

      const confidence = response.results.length > 0 
        ? response.results[0].alternatives[0].confidence || 0.8
        : 0.5;

      logger.info('Google Speech transcription successful', {
        transcript: transcription.substring(0, 100),
        confidence,
        resultsCount: response.results.length
      });

      return {
        transcript: transcription.trim(),
        confidence,
        language: config.languageCode,
        service: 'google'
      };
    } catch (error) {
      
      logger.error('Google Cloud Speech error:', {
        message: error.message,
        code: error.code,
        status: error.status
      });

      // Handle specific Google Cloud errors
      if (error instanceof AppError) {
        throw error;
      }

      if (error.code === 3 || error.code === 'INVALID_ARGUMENT') {
        throw new AppError(
          'Invalid audio format or configuration',
          400,
          ERROR_TYPES.SPEECH_AUDIO_INVALID_FORMAT
        );
      }

      if (error.code === 7 || error.code === 'PERMISSION_DENIED') {
        throw new AppError(
          'Google Cloud Speech permission denied',
          403,
          ERROR_TYPES.AUTH_INSUFFICIENT_PERMISSIONS
        );
      }

      if (error.code === 16 || error.code === 'UNAUTHENTICATED') {
        throw new AppError(
          'Google Cloud Speech authentication failed',
          401,
          ERROR_TYPES.AUTH_MISSING_CREDENTIALS
        );
      }

      if (error.code === 8 || error.code === 'RESOURCE_EXHAUSTED') {
        throw new AppError(
          'Google Cloud Speech quota exceeded',
          429,
          ERROR_TYPES.SPEECH_QUOTA_EXCEEDED
        );
      }

      // Generic network/connection errors
      if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        throw new AppError(
          'Unable to connect to Google Cloud Speech service',
          503,
          ERROR_TYPES.SPEECH_SERVICE_UNAVAILABLE
        );
      }

      // Default to speech recognition failed
      throw new AppError(
        `Google Cloud Speech failed: ${error.message}`,
        500,
        ERROR_TYPES.SPEECH_RECOGNITION_FAILED,
        null,
        { originalError: error.code }
      );
    }
  }

  async transcribeWithOpenAI(audioBuffer, options = {}) {
    try {
      // Create a temporary file for OpenAI API
      const tempFileName = `temp_audio_${Date.now()}.webm`;
      const tempFilePath = path.join('/tmp', tempFileName);
      
      // Write buffer to temporary file
      fs.writeFileSync(tempFilePath, audioBuffer);
      
      try {
        const transcription = await this.openaiClient.audio.transcriptions.create({
          file: fs.createReadStream(tempFilePath),
          model: 'whisper-1',
          language: options.languageCode?.split('-')[0] || 'en',
          response_format: 'text',
        });

        if (!transcription || transcription.trim() === '') {
          throw new Error('No speech detected in audio');
        }

        return transcription.trim();
      } finally {
        // Clean up temporary file
        if (fs.existsSync(tempFilePath)) {
          fs.unlinkSync(tempFilePath);
        }
      }
    } catch (error) {
      logger.error('OpenAI Whisper error:', error);
      throw new Error(`OpenAI Whisper failed: ${error.message}`);
    }
  }

  // Stream-based transcription for real-time applications
  async createStreamingRecognition(options = {}) {
    if (!this.googleClient) {
      throw new Error('Google Cloud Speech client not available for streaming');
    }

    const config = {
      encoding: options.encoding || 'WEBM_OPUS',
      sampleRateHertz: options.sampleRate || 48000,
      languageCode: options.languageCode || 'en-US',
      enableAutomaticPunctuation: true,
      interimResults: true,
      model: 'latest_short',
      useEnhanced: true,
    };

    const request = {
      config: config,
      interimResults: true,
    };

    const recognizeStream = this.googleClient
      .streamingRecognize(request)
      .on('error', (error) => {
        logger.error('Streaming recognition error:', error);
      });

    return recognizeStream;
  }

  // Check service availability
  async checkAvailability() {
    const status = {
      google: false,
      openai: false,
      available: false
    };

    // Test Google Cloud Speech
    if (this.googleClient) {
      try {
        // Create a simple test request
        status.google = true;
        logger.info('Google Cloud Speech is available');
      } catch (error) {
        logger.warn('Google Cloud Speech test failed:', error.message);
      }
    }

    // Test OpenAI
    if (this.openaiClient) {
      try {
        // OpenAI client is initialized, assume it's available
        status.openai = true;
        logger.info('OpenAI Whisper is available');
      } catch (error) {
        logger.warn('OpenAI test failed:', error.message);
      }
    }

    status.available = status.google || status.openai;
    return status;
  }
}

module.exports = new SpeechService();