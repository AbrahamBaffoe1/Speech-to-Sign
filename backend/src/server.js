const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const path = require('path');
require('dotenv').config();

const speechService = require('./services/speechService');
const mappingService = require('./services/mappingService');
const streamController = require('./controllers/streamController');
const { errorHandler, notFound } = require('./middleware/errorMiddleware');
const { requestTracker, performanceMonitor, trackError, getSystemHealth } = require('./middleware/monitoring');
const { logger } = require('./utils/logger');

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());
app.use(compression());

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX) || 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Monitoring middleware
app.use(requestTracker);
app.use(performanceMonitor);

// Configure multer for audio file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('Only audio files are allowed!'), false);
    }
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  const health = getSystemHealth();
  res.json({ 
    status: health.status === 'healthy' ? 'OK' : health.status,
    timestamp: new Date().toISOString(),
    service: 'speech-to-sign-backend',
    uptime: health.uptime,
    issues: health.issues
  });
});

// Detailed metrics endpoint
app.get('/metrics', (req, res) => {
  const health = getSystemHealth();
  res.json(health);
});

// System status endpoint
app.get('/status', (req, res) => {
  const health = getSystemHealth();
  res.json({
    service: 'speech-to-sign-backend',
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    status: health.status,
    uptime: health.uptime,
    timestamp: health.timestamp,
    summary: {
      totalRequests: health.metrics.requests.total,
      successRate: health.metrics.requests.successRate,
      avgLatency: health.metrics.processing.avgLatency
    }
  });
});

// Speech recognition endpoint
app.post('/api/transcribe', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file provided' });
    }

    logger.info('Processing audio transcription request');
    
    // Handle both file upload and base64 audio data
    let audioData;
    if (req.file) {
      audioData = req.file.buffer;
    } else if (req.body.audio) {
      // Handle base64 encoded audio
      const base64Data = req.body.audio.replace(/^data:audio\/[a-z]+;base64,/, '');
      audioData = Buffer.from(base64Data, 'base64');
    } else {
      return res.status(400).json({ error: 'No audio data provided' });
    }

    const transcript = await speechService.transcribeAudio(audioData);
    
    logger.info('Transcription completed', { transcript });
    
    res.json({
      transcript: transcript,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    trackError(error, 'transcription');
    logger.error('Transcription error:', error);
    res.status(500).json({ 
      error: 'Speech recognition failed',
      message: error.message 
    });
  }
});

// Text to sign mapping endpoint
app.post('/api/map', async (req, res) => {
  try {
    const { text } = req.body;
    
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Text is required and must be a string' });
    }

    logger.info('Processing text mapping request', { text });
    
    const mappingResult = await mappingService.mapTextToSigns(text);
    
    logger.info('Mapping completed', { result: mappingResult });
    
    res.json({
      originalText: text,
      mappedSigns: mappingResult.signs,
      captions: mappingResult.captions,
      confidence: mappingResult.confidence,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    trackError(error, 'mapping');
    logger.error('Mapping error:', error);
    res.status(500).json({ 
      error: 'Text to sign mapping failed',
      message: error.message 
    });
  }
});

// Combined transcribe and map endpoint for efficiency
app.post('/api/speech-to-signs', upload.single('audio'), async (req, res) => {
  try {
    let audioData;
    
    // Handle audio input
    if (req.file) {
      audioData = req.file.buffer;
    } else if (req.body.audio) {
      const base64Data = req.body.audio.replace(/^data:audio\/[a-z]+;base64,/, '');
      audioData = Buffer.from(base64Data, 'base64');
    } else {
      return res.status(400).json({ error: 'No audio data provided' });
    }

    logger.info('Processing combined speech-to-signs request');

    // Step 1: Transcribe audio
    const transcript = await speechService.transcribeAudio(audioData);
    
    // Step 2: Map to signs
    const mappingResult = await mappingService.mapTextToSigns(transcript);
    
    logger.info('Combined processing completed', { transcript, mappingResult });
    
    res.json({
      transcript: transcript,
      mappedSigns: mappingResult.signs,
      captions: mappingResult.captions,
      confidence: mappingResult.confidence,
      processingTime: mappingResult.processingTime,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    trackError(error, 'combined-processing');
    logger.error('Combined processing error:', error);
    res.status(500).json({ 
      error: 'Speech to signs conversion failed',
      message: error.message 
    });
  }
});

// Get available vocabulary
app.get('/api/vocabulary', async (req, res) => {
  try {
    const vocabulary = await mappingService.getVocabulary();
    res.json({
      vocabulary: vocabulary,
      count: vocabulary.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Vocabulary retrieval error:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve vocabulary',
      message: error.message 
    });
  }
});

// Streaming connection statistics
app.get('/api/streaming/stats', (_req, res) => {
  try {
    const stats = streamController.getStats();
    res.json({
      ...stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to get streaming stats:', error);
    res.status(500).json({
      error: 'Failed to get streaming statistics',
      message: error.message
    });
  }
});

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

// Start server
const server = app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  
  // Initialize WebSocket server after server is listening
  streamController.initialize(server);
  streamController.startCleanupTimer();
  logger.info('WebSocket streaming service initialized');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
  });
});

module.exports = app;