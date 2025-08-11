import React from 'react';

interface ErrorDisplayProps {
  error: {
    type?: string;
    message: string;
    suggestions?: string[];
    timestamp?: string;
    errorId?: string;
  };
  onRetry?: () => void;
  onDismiss?: () => void;
  className?: string;
}

const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ 
  error, 
  onRetry, 
  onDismiss, 
  className = '' 
}) => {
  const getErrorIcon = () => {
    switch (error.type) {
      case 'MICROPHONE_ACCESS_DENIED':
        return (
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364L5.636 5.636" />
          </svg>
        );
      case 'NETWORK_CONNECTION_FAILED':
        return (
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.288 15.038a5.25 5.25 0 017.424 0M5.106 11.856c3.807-3.808 9.98-3.808 13.788 0" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364L5.636 5.636" />
          </svg>
        );
      case 'SPEECH_QUOTA_EXCEEDED':
        return (
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'VIDEO_NOT_FOUND':
        return (
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M12 18.75H4.5a2.25 2.25 0 01-2.25-2.25v-9a2.25 2.25 0 012.25-2.25H12m0 13.5v-13.5m0 13.5h8.25a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25H12m0 0V5.25A2.25 2.25 0 009.75 3h-2.5A2.25 2.25 0 005.25 5.25v6.75h6.75z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364L5.636 5.636" />
          </svg>
        );
      default:
        return (
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
        );
    }
  };

  const getErrorColor = () => {
    switch (error.type) {
      case 'MICROPHONE_ACCESS_DENIED':
      case 'BROWSER_NOT_SUPPORTED':
        return 'orange';
      case 'NETWORK_CONNECTION_FAILED':
      case 'TIMEOUT':
        return 'blue';
      case 'SPEECH_QUOTA_EXCEEDED':
        return 'purple';
      default:
        return 'red';
    }
  };

  const color = getErrorColor();
  const colorClasses = {
    red: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      icon: 'text-red-600',
      text: 'text-red-800',
      button: 'bg-red-600 hover:bg-red-700'
    },
    orange: {
      bg: 'bg-orange-50',
      border: 'border-orange-200',
      icon: 'text-orange-600',
      text: 'text-orange-800',
      button: 'bg-orange-600 hover:bg-orange-700'
    },
    blue: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      icon: 'text-blue-600',
      text: 'text-blue-800',
      button: 'bg-blue-600 hover:bg-blue-700'
    },
    purple: {
      bg: 'bg-purple-50',
      border: 'border-purple-200',
      icon: 'text-purple-600',
      text: 'text-purple-800',
      button: 'bg-purple-600 hover:bg-purple-700'
    }
  };

  const classes = colorClasses[color as keyof typeof colorClasses];

  return (
    <div className={`rounded-2xl border p-6 ${classes.bg} ${classes.border} ${className} animate-slide-up`}>
      <div className="flex items-start space-x-4">
        {/* Error Icon */}
        <div className={`flex-shrink-0 ${classes.icon}`}>
          {getErrorIcon()}
        </div>

        {/* Error Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-2">
            <h3 className={`text-lg font-semibold ${classes.text}`}>
              {getErrorTitle(error.type)}
            </h3>
            
            {onDismiss && (
              <button
                onClick={onDismiss}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Dismiss error"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          <p className={`text-sm ${classes.text} mb-4 leading-relaxed`}>
            {error.message}
          </p>

          {/* Error Suggestions */}
          {error.suggestions && error.suggestions.length > 0 && (
            <div className="mb-4">
              <h4 className={`text-sm font-medium ${classes.text} mb-2`}>
                Try these solutions:
              </h4>
              <ul className={`text-sm ${classes.text} space-y-1 list-none`}>
                {error.suggestions.map((suggestion, index) => (
                  <li key={index} className="flex items-start space-x-2">
                    <span className="text-xs mt-1">•</span>
                    <span>{suggestion}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center space-x-3">
            {onRetry && (
              <button
                onClick={onRetry}
                className={`px-4 py-2 ${classes.button} text-white rounded-lg font-medium text-sm transition-colors duration-200 flex items-center space-x-2`}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                </svg>
                <span>Try Again</span>
              </button>
            )}

            {/* Quick Fix Buttons */}
            {error.type === 'MICROPHONE_ACCESS_DENIED' && (
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-medium text-sm transition-colors duration-200"
              >
                Reload Page
              </button>
            )}
          </div>

          {/* Error Details */}
          {(error.timestamp || error.errorId) && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between text-xs text-gray-500">
                {error.timestamp && (
                  <span>Occurred: {new Date(error.timestamp).toLocaleTimeString()}</span>
                )}
                {error.errorId && (
                  <span>Error ID: {error.errorId}</span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

function getErrorTitle(errorType?: string): string {
  switch (errorType) {
    case 'MICROPHONE_ACCESS_DENIED':
      return 'Microphone Access Required';
    case 'SPEECH_RECOGNITION_FAILED':
      return 'Speech Recognition Failed';
    case 'NETWORK_CONNECTION_FAILED':
      return 'Connection Problem';
    case 'VIDEO_NOT_FOUND':
      return 'Sign Video Unavailable';
    case 'SPEECH_QUOTA_EXCEEDED':
      return 'Usage Limit Reached';
    case 'BROWSER_NOT_SUPPORTED':
      return 'Browser Not Supported';
    case 'TIMEOUT':
      return 'Request Timed Out';
    default:
      return 'Something Went Wrong';
  }
}

export default ErrorDisplay;