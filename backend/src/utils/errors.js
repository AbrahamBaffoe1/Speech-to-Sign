/**
 * Comprehensive Error Handling System
 * Defines error types, user-friendly messages, and error utilities
 */

class AppError extends Error {
  constructor(message, statusCode, errorType, userMessage = null, details = null) {
    super(message);
    
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.errorType = errorType;
    this.userMessage = userMessage || this.getUserFriendlyMessage();
    this.details = details;
    this.timestamp = new Date().toISOString();
    this.isOperational = true;
    
    Error.captureStackTrace(this, this.constructor);
  }

  getUserFriendlyMessage() {
    return ERROR_MESSAGES[this.errorType] || 'An unexpected error occurred. Please try again.';
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      userMessage: this.userMessage,
      statusCode: this.statusCode,
      errorType: this.errorType,
      details: this.details,
      timestamp: this.timestamp
    };
  }
}

// Error Types
const ERROR_TYPES = {
  // Authentication & Authorization
  AUTH_INVALID_CREDENTIALS: 'AUTH_INVALID_CREDENTIALS',
  AUTH_MISSING_CREDENTIALS: 'AUTH_MISSING_CREDENTIALS',
  AUTH_TOKEN_EXPIRED: 'AUTH_TOKEN_EXPIRED',
  AUTH_INSUFFICIENT_PERMISSIONS: 'AUTH_INSUFFICIENT_PERMISSIONS',

  // Speech Recognition
  SPEECH_SERVICE_UNAVAILABLE: 'SPEECH_SERVICE_UNAVAILABLE',
  SPEECH_RECOGNITION_FAILED: 'SPEECH_RECOGNITION_FAILED',
  SPEECH_AUDIO_TOO_LARGE: 'SPEECH_AUDIO_TOO_LARGE',
  SPEECH_AUDIO_INVALID_FORMAT: 'SPEECH_AUDIO_INVALID_FORMAT',
  SPEECH_AUDIO_TOO_SHORT: 'SPEECH_AUDIO_TOO_SHORT',
  SPEECH_NO_AUDIO_DETECTED: 'SPEECH_NO_AUDIO_DETECTED',
  SPEECH_QUOTA_EXCEEDED: 'SPEECH_QUOTA_EXCEEDED',

  // Video & Mapping
  VIDEO_NOT_FOUND: 'VIDEO_NOT_FOUND',
  VIDEO_LOAD_FAILED: 'VIDEO_LOAD_FAILED',
  MAPPING_NOT_FOUND: 'MAPPING_NOT_FOUND',
  MAPPING_INVALID: 'MAPPING_INVALID',
  VOCABULARY_LOAD_FAILED: 'VOCABULARY_LOAD_FAILED',

  // Network & Server
  NETWORK_CONNECTION_FAILED: 'NETWORK_CONNECTION_FAILED',
  SERVER_OVERLOADED: 'SERVER_OVERLOADED',
  SERVER_MAINTENANCE: 'SERVER_MAINTENANCE',
  TIMEOUT: 'TIMEOUT',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',

  // Client Side
  MICROPHONE_ACCESS_DENIED: 'MICROPHONE_ACCESS_DENIED',
  MICROPHONE_NOT_AVAILABLE: 'MICROPHONE_NOT_AVAILABLE',
  BROWSER_NOT_SUPPORTED: 'BROWSER_NOT_SUPPORTED',
  BROWSER_SECURITY_RESTRICTION: 'BROWSER_SECURITY_RESTRICTION',

  // File & Storage
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  FILE_INVALID_TYPE: 'FILE_INVALID_TYPE',
  STORAGE_UNAVAILABLE: 'STORAGE_UNAVAILABLE',
  STORAGE_QUOTA_EXCEEDED: 'STORAGE_QUOTA_EXCEEDED',

  // General
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  CONFIGURATION_ERROR: 'CONFIGURATION_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR'
};

// User-friendly error messages
const ERROR_MESSAGES = {
  // Authentication & Authorization
  [ERROR_TYPES.AUTH_INVALID_CREDENTIALS]: 'Invalid credentials. Please check your login information.',
  [ERROR_TYPES.AUTH_MISSING_CREDENTIALS]: 'Authentication required. Please log in to continue.',
  [ERROR_TYPES.AUTH_TOKEN_EXPIRED]: 'Your session has expired. Please log in again.',
  [ERROR_TYPES.AUTH_INSUFFICIENT_PERMISSIONS]: 'You don\'t have permission to perform this action.',

  // Speech Recognition
  [ERROR_TYPES.SPEECH_SERVICE_UNAVAILABLE]: 'Speech recognition service is temporarily unavailable. Please try again in a few moments.',
  [ERROR_TYPES.SPEECH_RECOGNITION_FAILED]: 'We couldn\'t understand your speech. Please speak clearly and try again.',
  [ERROR_TYPES.SPEECH_AUDIO_TOO_LARGE]: 'Your audio recording is too long. Please keep recordings under 1 minute.',
  [ERROR_TYPES.SPEECH_AUDIO_INVALID_FORMAT]: 'Invalid audio format. Please ensure your microphone is working properly.',
  [ERROR_TYPES.SPEECH_AUDIO_TOO_SHORT]: 'Your recording is too short. Please speak for at least 1 second.',
  [ERROR_TYPES.SPEECH_NO_AUDIO_DETECTED]: 'No speech detected. Please check your microphone and speak clearly.',
  [ERROR_TYPES.SPEECH_QUOTA_EXCEEDED]: 'You\'ve reached the daily usage limit. Please try again tomorrow or upgrade your plan.',

  // Video & Mapping
  [ERROR_TYPES.VIDEO_NOT_FOUND]: 'Sign language video not available. We\'re working to add more signs.',
  [ERROR_TYPES.VIDEO_LOAD_FAILED]: 'Unable to load sign language video. Please check your internet connection.',
  [ERROR_TYPES.MAPPING_NOT_FOUND]: 'We don\'t have a sign for this word yet. Try using simpler words or phrases.',
  [ERROR_TYPES.MAPPING_INVALID]: 'Translation error occurred. Please try rephrasing your message.',
  [ERROR_TYPES.VOCABULARY_LOAD_FAILED]: 'Unable to load sign language dictionary. Please refresh the page.',

  // Network & Server
  [ERROR_TYPES.NETWORK_CONNECTION_FAILED]: 'Connection failed. Please check your internet connection and try again.',
  [ERROR_TYPES.SERVER_OVERLOADED]: 'Our servers are experiencing high traffic. Please wait a moment and try again.',
  [ERROR_TYPES.SERVER_MAINTENANCE]: 'The service is temporarily down for maintenance. Please try again shortly.',
  [ERROR_TYPES.TIMEOUT]: 'Request timed out. Please try again.',
  [ERROR_TYPES.RATE_LIMIT_EXCEEDED]: 'Too many requests. Please wait a moment before trying again.',

  // Client Side
  [ERROR_TYPES.MICROPHONE_ACCESS_DENIED]: 'Microphone access denied. Please allow microphone access in your browser settings.',
  [ERROR_TYPES.MICROPHONE_NOT_AVAILABLE]: 'No microphone detected. Please connect a microphone and refresh the page.',
  [ERROR_TYPES.BROWSER_NOT_SUPPORTED]: 'Your browser doesn\'t support this feature. Please use Chrome, Firefox, or Safari.',
  [ERROR_TYPES.BROWSER_SECURITY_RESTRICTION]: 'Browser security settings are blocking this feature. Please ensure you\'re using HTTPS.',

  // File & Storage
  [ERROR_TYPES.FILE_TOO_LARGE]: 'File is too large. Please use a smaller file.',
  [ERROR_TYPES.FILE_INVALID_TYPE]: 'Invalid file type. Please use a supported format.',
  [ERROR_TYPES.STORAGE_UNAVAILABLE]: 'Storage service is temporarily unavailable.',
  [ERROR_TYPES.STORAGE_QUOTA_EXCEEDED]: 'Storage quota exceeded. Please free up some space.',

  // General
  [ERROR_TYPES.VALIDATION_ERROR]: 'Invalid input. Please check your information and try again.',
  [ERROR_TYPES.CONFIGURATION_ERROR]: 'System configuration error. Please contact support.',
  [ERROR_TYPES.UNKNOWN_ERROR]: 'Something unexpected happened. Please try again or contact support if the problem persists.'
};

// Error detection utilities
class ErrorDetector {
  static detectErrorType(error) {
    const errorMessage = error.message?.toLowerCase() || '';
    const errorCode = error.code;
    const statusCode = error.statusCode || error.status;

    // Google Cloud Speech errors
    if (errorMessage.includes('permission denied') || errorCode === 'PERMISSION_DENIED') {
      return ERROR_TYPES.AUTH_INSUFFICIENT_PERMISSIONS;
    }
    if (errorMessage.includes('unauthenticated') || errorCode === 'UNAUTHENTICATED') {
      return ERROR_TYPES.AUTH_MISSING_CREDENTIALS;
    }
    if (errorMessage.includes('quota exceeded') || errorCode === 'QUOTA_EXCEEDED') {
      return ERROR_TYPES.SPEECH_QUOTA_EXCEEDED;
    }
    if (errorMessage.includes('invalid argument') && errorMessage.includes('audio')) {
      return ERROR_TYPES.SPEECH_AUDIO_INVALID_FORMAT;
    }

    // Network errors
    if (errorMessage.includes('enotfound') || errorMessage.includes('network')) {
      return ERROR_TYPES.NETWORK_CONNECTION_FAILED;
    }
    if (errorMessage.includes('timeout') || errorCode === 'ETIMEDOUT') {
      return ERROR_TYPES.TIMEOUT;
    }
    if (statusCode === 429) {
      return ERROR_TYPES.RATE_LIMIT_EXCEEDED;
    }

    // File errors
    if (errorMessage.includes('file too large') || errorCode === 'LIMIT_FILE_SIZE') {
      return ERROR_TYPES.FILE_TOO_LARGE;
    }
    if (errorMessage.includes('enoent') || errorMessage.includes('not found')) {
      return ERROR_TYPES.VIDEO_NOT_FOUND;
    }

    // Server errors
    if (statusCode >= 500) {
      return ERROR_TYPES.SERVER_OVERLOADED;
    }

    return ERROR_TYPES.UNKNOWN_ERROR;
  }

  static createAppError(originalError, customType = null, customMessage = null) {
    const errorType = customType || this.detectErrorType(originalError);
    const statusCode = originalError.statusCode || originalError.status || 500;
    
    return new AppError(
      originalError.message || 'Unknown error',
      statusCode,
      errorType,
      customMessage,
      {
        originalError: originalError.name,
        stack: originalError.stack
      }
    );
  }
}

// Recovery suggestions
const RECOVERY_SUGGESTIONS = {
  [ERROR_TYPES.SPEECH_RECOGNITION_FAILED]: [
    'Speak more slowly and clearly',
    'Move closer to your microphone',
    'Reduce background noise',
    'Try shorter phrases'
  ],
  [ERROR_TYPES.MICROPHONE_ACCESS_DENIED]: [
    'Click the microphone icon in your browser address bar',
    'Allow microphone access when prompted',
    'Check browser settings for microphone permissions',
    'Refresh the page and try again'
  ],
  [ERROR_TYPES.NETWORK_CONNECTION_FAILED]: [
    'Check your internet connection',
    'Try refreshing the page',
    'Disable VPN if using one',
    'Try again in a few minutes'
  ],
  [ERROR_TYPES.VIDEO_NOT_FOUND]: [
    'Try using simpler words',
    'Break down complex phrases',
    'Check our sign dictionary for available words',
    'Contact us to request new signs'
  ]
};

// Export utilities
function createError(message, statusCode = 500, errorType = ERROR_TYPES.UNKNOWN_ERROR, userMessage = null) {
  return new AppError(message, statusCode, errorType, userMessage);
}

function createErrorFromException(error, customType = null, customMessage = null) {
  return ErrorDetector.createAppError(error, customType, customMessage);
}

function isOperationalError(error) {
  return error instanceof AppError && error.isOperational;
}

function getRecoverySuggestions(errorType) {
  return RECOVERY_SUGGESTIONS[errorType] || [];
}

module.exports = {
  AppError,
  ERROR_TYPES,
  ERROR_MESSAGES,
  ErrorDetector,
  RECOVERY_SUGGESTIONS,
  createError,
  createErrorFromException,
  isOperationalError,
  getRecoverySuggestions
};