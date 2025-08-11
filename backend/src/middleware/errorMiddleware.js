const { logger } = require('../utils/logger');
const { 
  AppError, 
  ERROR_TYPES, 
  createErrorFromException, 
  isOperationalError,
  getRecoverySuggestions 
} = require('../utils/errors');

const notFound = (req, res, next) => {
  const error = new AppError(
    `Not found - ${req.originalUrl}`,
    404,
    ERROR_TYPES.VALIDATION_ERROR,
    `The page or resource you're looking for doesn't exist.`
  );
  next(error);
};

const errorHandler = (err, req, res, next) => {
  let appError;

  // Convert regular errors to AppErrors
  if (!(err instanceof AppError)) {
    appError = createErrorFromException(err);
  } else {
    appError = err;
  }

  // Handle specific error scenarios
  if (err.code === 'LIMIT_FILE_SIZE') {
    appError = new AppError(
      'File upload size limit exceeded',
      400,
      ERROR_TYPES.SPEECH_AUDIO_TOO_LARGE,
      'Your audio recording is too long. Please keep recordings under 1 minute.'
    );
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    appError = new AppError(
      'Unexpected file upload',
      400,
      ERROR_TYPES.SPEECH_AUDIO_INVALID_FORMAT,
      'Invalid file format. Please ensure you\'re uploading an audio file.'
    );
  }

  // Handle Google Cloud errors
  if (err.message?.includes('ENOENT') && err.message?.includes('service-account')) {
    appError = new AppError(
      'Google Cloud credentials not found',
      500,
      ERROR_TYPES.SPEECH_SERVICE_UNAVAILABLE,
      'Speech recognition service is not properly configured. Please contact support.'
    );
  }

  if (err.code === 'PERMISSION_DENIED' || err.code === 3) {
    appError = new AppError(
      'Google Cloud permission denied',
      403,
      ERROR_TYPES.AUTH_INSUFFICIENT_PERMISSIONS,
      'Speech recognition service permissions error. Please contact support.'
    );
  }

  // Handle rate limiting
  if (err.statusCode === 429 || err.status === 429) {
    appError = new AppError(
      'Too many requests',
      429,
      ERROR_TYPES.RATE_LIMIT_EXCEEDED,
      'You\'re making requests too quickly. Please wait a moment and try again.'
    );
  }

  // Log error details with structured logging
  const errorLog = {
    errorId: generateErrorId(),
    type: appError.errorType,
    message: appError.message,
    userMessage: appError.userMessage,
    statusCode: appError.statusCode,
    timestamp: appError.timestamp,
    request: {
      url: req.originalUrl,
      method: req.method,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      body: sanitizeRequestBody(req.body)
    },
    isOperational: isOperationalError(appError)
  };

  // Log with appropriate level
  if (appError.statusCode >= 500) {
    logger.error('Server error occurred:', errorLog);
  } else if (appError.statusCode >= 400) {
    logger.warn('Client error occurred:', errorLog);
  } else {
    logger.info('Non-error exception:', errorLog);
  }

  // Prepare response
  const response = {
    success: false,
    error: {
      type: appError.errorType,
      message: appError.userMessage,
      timestamp: appError.timestamp,
      errorId: errorLog.errorId
    }
  };

  // Add recovery suggestions for common errors
  const suggestions = getRecoverySuggestions(appError.errorType);
  if (suggestions.length > 0) {
    response.error.suggestions = suggestions;
  }

  // Add technical details in development
  if (process.env.NODE_ENV === 'development') {
    response.error.technical = {
      originalMessage: appError.message,
      stack: appError.stack,
      details: appError.details
    };
  }

  res.status(appError.statusCode).json(response);
};

// Utility functions
function generateErrorId() {
  return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function sanitizeRequestBody(body) {
  if (!body) return null;
  
  const sanitized = { ...body };
  
  // Remove sensitive data
  const sensitiveFields = ['password', 'token', 'apiKey', 'secret'];
  sensitiveFields.forEach(field => {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  });
  
  // Truncate large audio data
  if (sanitized.audio && sanitized.audio.length > 100) {
    sanitized.audio = `[AUDIO_DATA_${sanitized.audio.length}_BYTES]`;
  }
  
  return sanitized;
}

// Global exception handlers
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', {
    message: error.message,
    stack: error.stack
  });
  
  // Give time for logging then exit
  setTimeout(() => {
    process.exit(1);
  }, 1000);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', {
    promise,
    reason: reason?.message || reason
  });
  
  // Don't exit, just log for now
});

module.exports = {
  notFound,
  errorHandler
};