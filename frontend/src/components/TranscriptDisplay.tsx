import React from 'react';
import { TranscriptDisplayProps } from '../types/types';

const TranscriptDisplay: React.FC<TranscriptDisplayProps> = ({
  transcript,
  isProcessing
}) => {
  return (
    <div className="card">
      <div className="card-header">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center justify-between">
          <span className="flex items-center">
            📝 Recognized Speech
          </span>
          {isProcessing && (
            <div className="flex items-center space-x-2 text-yellow-600">
              <div className="w-4 h-4 border-2 border-yellow-600 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-sm font-medium">Processing...</span>
            </div>
          )}
        </h3>
      </div>
      
      <div className="min-h-[120px] flex items-center justify-center">
        {transcript ? (
          <div className="w-full">
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 border border-blue-100">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm">💬</span>
                  </div>
                </div>
                <div className="flex-1">
                  <p className="text-gray-900 text-lg leading-relaxed font-medium">
                    "{transcript}"
                  </p>
                  <div className="mt-3 flex items-center text-sm text-gray-500">
                    <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Speech recognized successfully
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center">
            {isProcessing ? (
              <div className="space-y-4">
                <div className="w-16 h-16 bg-gradient-to-br from-yellow-100 to-orange-100 rounded-full flex items-center justify-center mx-auto">
                  <div className="w-6 h-6 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
                <div>
                  <h4 className="text-lg font-medium text-gray-900 mb-1">Converting speech to text...</h4>
                  <p className="text-gray-500">Please wait while we process your audio</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-slate-100 rounded-full flex items-center justify-center mx-auto">
                  <span className="text-2xl">💭</span>
                </div>
                <div>
                  <h4 className="text-lg font-medium text-gray-900 mb-1">Ready to listen</h4>
                  <p className="text-gray-500 max-w-sm mx-auto">
                    Your spoken words will appear here after recording
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TranscriptDisplay;