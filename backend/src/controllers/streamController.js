const { Server } = require('socket.io');
const speechService = require('../services/speechService');
const mappingService = require('../services/mappingService');
const { logger } = require('../utils/logger');
const { trackError } = require('../middleware/monitoring');

class StreamController {
  constructor() {
    this.io = null;
    this.activeConnections = new Map(); // Store active streaming sessions
  }

  initialize(server) {
    this.io = new Server(server, {
      cors: {
        origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
        methods: ['GET', 'POST'],
        credentials: true
      },
      pingTimeout: 60000,
      pingInterval: 25000
    });

    this.setupEventHandlers();
    logger.info('WebSocket server initialized');
  }

  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      logger.info(`Client connected: ${socket.id}`);

      // Handle streaming speech recognition
      socket.on('start-streaming', async (options) => {
        try {
          await this.startStreamingRecognition(socket, options);
        } catch (error) {
          logger.error('Failed to start streaming:', error);
          socket.emit('error', { message: 'Failed to start streaming recognition' });
        }
      });

      // Handle incoming audio data
      socket.on('audio-data', async (audioData) => {
        try {
          await this.processStreamingAudio(socket, audioData);
        } catch (error) {
          logger.error('Failed to process audio data:', error);
          socket.emit('error', { message: 'Failed to process audio data' });
        }
      });

      // Handle stop streaming
      socket.on('stop-streaming', () => {
        this.stopStreamingRecognition(socket);
      });

      // Handle disconnect
      socket.on('disconnect', () => {
        logger.info(`Client disconnected: ${socket.id}`);
        this.stopStreamingRecognition(socket);
      });

      // Handle errors
      socket.on('error', (error) => {
        logger.error(`Socket error for ${socket.id}:`, error);
        trackError(error, 'websocket');
      });
    });
  }

  async startStreamingRecognition(socket, options = {}) {
    try {
      const sessionConfig = {
        encoding: options.encoding || 'WEBM_OPUS',
        sampleRate: options.sampleRate || 48000,
        languageCode: options.languageCode || 'en-US',
        interimResults: options.interimResults !== false,
        enableWordTimeOffsets: false,
        model: 'latest_short',
        useEnhanced: true
      };

      logger.info(`Starting streaming recognition for ${socket.id}`, sessionConfig);

      // Create Google Cloud Speech streaming recognition
      const recognizeStream = await speechService.createStreamingRecognition(sessionConfig);
      
      if (!recognizeStream) {
        throw new Error('Failed to create streaming recognition');
      }

      // Store the stream reference
      this.activeConnections.set(socket.id, {
        recognizeStream,
        config: sessionConfig,
        startTime: Date.now(),
        lastActivity: Date.now()
      });

      // Handle streaming results
      recognizeStream.on('data', (data) => {
        try {
          this.handleStreamingResult(socket, data);
        } catch (error) {
          logger.error('Error handling streaming result:', error);
        }
      });

      // Handle stream errors
      recognizeStream.on('error', (error) => {
        logger.error(`Streaming recognition error for ${socket.id}:`, error);
        socket.emit('streaming-error', { 
          message: 'Speech recognition error',
          error: error.message 
        });
        this.stopStreamingRecognition(socket);
      });

      // Handle stream end
      recognizeStream.on('end', () => {
        logger.info(`Streaming recognition ended for ${socket.id}`);
        socket.emit('streaming-ended');
        this.stopStreamingRecognition(socket);
      });

      socket.emit('streaming-started', { 
        sessionId: socket.id,
        config: sessionConfig 
      });

    } catch (error) {
      logger.error(`Failed to start streaming for ${socket.id}:`, error);
      socket.emit('streaming-error', { 
        message: 'Failed to start streaming recognition',
        error: error.message 
      });
      throw error;
    }
  }

  async processStreamingAudio(socket, audioData) {
    const connection = this.activeConnections.get(socket.id);
    
    if (!connection) {
      socket.emit('error', { message: 'No active streaming session' });
      return;
    }

    try {
      // Update last activity
      connection.lastActivity = Date.now();

      // Convert base64 audio data to buffer if needed
      let audioBuffer;
      if (typeof audioData === 'string') {
        audioBuffer = Buffer.from(audioData, 'base64');
      } else if (audioData instanceof ArrayBuffer) {
        audioBuffer = Buffer.from(audioData);
      } else {
        audioBuffer = audioData;
      }

      // Send audio data to Google Cloud Speech stream
      if (connection.recognizeStream && !connection.recognizeStream.destroyed) {
        connection.recognizeStream.write(audioBuffer);
      } else {
        logger.warn(`Streaming session for ${socket.id} is no longer active`);
        socket.emit('streaming-error', { message: 'Streaming session ended' });
      }

    } catch (error) {
      logger.error(`Failed to process audio for ${socket.id}:`, error);
      socket.emit('error', { 
        message: 'Failed to process audio data',
        error: error.message 
      });
    }
  }

  async handleStreamingResult(socket, data) {
    try {
      if (!data.results || data.results.length === 0) {
        return;
      }

      const result = data.results[0];
      const transcript = result.alternatives[0].transcript;
      const confidence = result.alternatives[0].confidence || 0.8;
      const isFinal = result.isFinal;

      logger.debug(`Streaming result for ${socket.id}:`, {
        transcript: transcript.substring(0, 50),
        isFinal,
        confidence
      });

      // Emit interim or final transcript
      socket.emit('transcript-update', {
        transcript,
        confidence,
        isFinal,
        timestamp: new Date().toISOString()
      });

      // If final result, also process sign mapping
      if (isFinal && transcript.trim()) {
        try {
          const mappingResult = await mappingService.mapTextToSigns(transcript);
          
          socket.emit('signs-update', {
            originalText: transcript,
            mappedSigns: mappingResult.signs,
            captions: mappingResult.captions,
            confidence: mappingResult.confidence,
            timestamp: new Date().toISOString()
          });

          logger.info(`Sign mapping completed for ${socket.id}:`, {
            transcript: transcript.substring(0, 50),
            signsCount: mappingResult.signs?.length || 0
          });

        } catch (mappingError) {
          logger.error(`Sign mapping error for ${socket.id}:`, mappingError);
          socket.emit('mapping-error', {
            message: 'Failed to map text to signs',
            error: mappingError.message
          });
        }
      }

    } catch (error) {
      logger.error(`Failed to handle streaming result for ${socket.id}:`, error);
      socket.emit('error', {
        message: 'Failed to process recognition result',
        error: error.message
      });
    }
  }

  stopStreamingRecognition(socket) {
    const connection = this.activeConnections.get(socket.id);
    
    if (connection) {
      try {
        if (connection.recognizeStream && !connection.recognizeStream.destroyed) {
          connection.recognizeStream.end();
        }
        
        const duration = Date.now() - connection.startTime;
        logger.info(`Streaming session ended for ${socket.id}`, {
          duration: `${duration}ms`,
          config: connection.config
        });

      } catch (error) {
        logger.error(`Error stopping streaming for ${socket.id}:`, error);
      } finally {
        this.activeConnections.delete(socket.id);
      }
    }

    socket.emit('streaming-stopped');
  }

  // Cleanup inactive connections
  startCleanupTimer() {
    setInterval(() => {
      const now = Date.now();
      const timeout = 5 * 60 * 1000; // 5 minutes

      for (const [socketId, connection] of this.activeConnections.entries()) {
        if (now - connection.lastActivity > timeout) {
          logger.warn(`Cleaning up inactive connection: ${socketId}`);
          this.activeConnections.delete(socketId);
          
          if (connection.recognizeStream && !connection.recognizeStream.destroyed) {
            connection.recognizeStream.end();
          }
        }
      }
    }, 60000); // Check every minute
  }

  // Get connection stats
  getStats() {
    return {
      activeConnections: this.activeConnections.size,
      connections: Array.from(this.activeConnections.entries()).map(([id, conn]) => ({
        id,
        startTime: conn.startTime,
        lastActivity: conn.lastActivity,
        duration: Date.now() - conn.startTime,
        config: conn.config
      }))
    };
  }
}

module.exports = new StreamController();