import React from 'react';
import { StatusIndicatorProps } from '../types/types';

const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  isRecording,
  isProcessing,
  confidence,
  error
}) => {
  const getStatusMessage = () => {
    if (error) {
      return `Error: ${error.message}`;
    }
    
    if (isRecording) {
      return 'Recording your speech...';
    }
    
    if (isProcessing) {
      return 'Converting speech to sign language...';
    }
    
    if (confidence > 0) {
      const confidencePercent = Math.round(confidence * 100);
      if (confidencePercent >= 80) {
        return `Translation complete (${confidencePercent}% confidence) ✅`;
      } else if (confidencePercent >= 50) {
        return `Translation complete (${confidencePercent}% confidence) ⚠️`;
      } else {
        return `Low confidence translation (${confidencePercent}%) ❌`;
      }
    }
    
    return 'Ready to record or type your message';
  };

  const getStatusIcon = () => {
    if (error) return '❌';
    if (isRecording) return '🎤';
    if (isProcessing) return '⏳';
    if (confidence > 0.8) return '✅';
    if (confidence > 0.5) return '⚠️';
    if (confidence > 0) return '❗';
    return '💬';
  };

  const confidencePercent = Math.round(confidence * 100);

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-4 sm:p-6 mb-6 sm:mb-8">
      <div className="flex items-center space-x-3 sm:space-x-4">
        {/* Status Icon */}
        <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-xl sm:text-2xl touch-target ${
          error ? 'bg-red-100' :
          isRecording ? 'bg-red-100 animate-pulse' :
          isProcessing ? 'bg-yellow-100' :
          confidence > 0.8 ? 'bg-green-100' :
          confidence > 0.5 ? 'bg-yellow-100' :
          confidence > 0 ? 'bg-red-100' :
          'bg-blue-100'
        }`}>
          {getStatusIcon()}
        </div>

        {/* Status Message */}
        <div className="flex-1 min-w-0">
          <p className={`text-base sm:text-lg font-semibold break-words ${
            error ? 'text-red-700' :
            isRecording ? 'text-red-700' :
            isProcessing ? 'text-yellow-700' :
            confidence > 0.8 ? 'text-green-700' :
            confidence > 0.5 ? 'text-yellow-700' :
            confidence > 0 ? 'text-red-700' :
            'text-gray-700'
          }`}>
            {getStatusMessage()}
          </p>
          
          {/* Confidence Bar */}
          {confidence > 0 && (
            <div className="mt-2 sm:mt-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs sm:text-sm font-medium text-gray-600">
                  Translation Confidence
                </span>
                <span className={`text-xs sm:text-sm font-bold ${
                  confidence > 0.8 ? 'text-green-600' :
                  confidence > 0.5 ? 'text-yellow-600' :
                  'text-red-600'
                }`}>
                  {confidencePercent}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 touch-action-pan-y">
                <div 
                  className={`h-2 rounded-full transition-all duration-300 ${
                    confidence > 0.8 ? 'bg-green-500' :
                    confidence > 0.5 ? 'bg-yellow-500' :
                    'bg-red-500'
                  }`}
                  style={{ width: `${confidencePercent}%` }}
                ></div>
              </div>
            </div>
          )}
        </div>

        {/* Activity Indicator */}
        {(isRecording || isProcessing) && (
          <div className="flex items-center">
            <div className={`w-3 h-3 rounded-full animate-pulse ${
              isRecording ? 'bg-red-500' : 'bg-yellow-500'
            }`}></div>
          </div>
        )}
      </div>

      {/* System Health Indicators */}
      <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-100">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 text-xs sm:text-sm text-gray-500">
          <div className="flex flex-wrap items-center gap-2 sm:gap-4">
            <div className="flex items-center space-x-1">
              <div className="status-dot status-success"></div>
              <span className="whitespace-nowrap">Speech Recognition</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="status-dot status-success"></div>
              <span className="whitespace-nowrap">Sign Translation</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="status-dot status-success"></div>
              <span className="whitespace-nowrap">Video Player</span>
            </div>
          </div>
          <div className="text-xs self-start sm:self-auto">
            System Status: Online
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatusIndicator;