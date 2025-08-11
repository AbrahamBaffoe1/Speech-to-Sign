import React, { useState, useEffect, useRef } from 'react';

interface StreamingTranscriptDisplayProps {
  interimTranscript?: string;
  finalTranscript?: string;
  confidence?: number;
  isStreaming?: boolean;
  isProcessing?: boolean;
  className?: string;
  maxEntries?: number;
}

interface TranscriptEntry {
  id: string;
  text: string;
  confidence: number;
  timestamp: string;
  isFinal: boolean;
}

const StreamingTranscriptDisplay: React.FC<StreamingTranscriptDisplayProps> = ({
  interimTranscript = '',
  finalTranscript = '',
  confidence = 0,
  isStreaming = false,
  isProcessing = false,
  className = '',
  maxEntries = 10
}) => {
  const [transcriptHistory, setTranscriptHistory] = useState<TranscriptEntry[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Add final transcript to history
  useEffect(() => {
    if (finalTranscript && finalTranscript.trim()) {
      const newEntry: TranscriptEntry = {
        id: Date.now().toString(),
        text: finalTranscript.trim(),
        confidence,
        timestamp: new Date().toLocaleTimeString(),
        isFinal: true
      };

      setTranscriptHistory(prev => {
        const newHistory = [newEntry, ...prev];
        return newHistory.slice(0, maxEntries);
      });
    }
  }, [finalTranscript, confidence, maxEntries]);

  // Auto-scroll to show latest content
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0; // Scroll to top since newest is at top
    }
  }, [transcriptHistory, interimTranscript]);

  // Clear history when starting new session
  const clearHistory = () => {
    setTranscriptHistory([]);
  };

  return (
    <div className={`card ${className}`}>
      <div className="card-header">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <span className="flex items-center">
              {isStreaming ? (
                <>
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse mr-2"></div>
                  🎙️ Live Transcript
                </>
              ) : (
                <>📝 Speech Transcript</>
              )}
            </span>
          </h3>
          
          <div className="flex items-center space-x-2">
            {(isProcessing || isStreaming) && (
              <div className="flex items-center space-x-2 text-blue-600">
                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-sm font-medium">
                  {isStreaming ? 'Streaming...' : 'Processing...'}
                </span>
              </div>
            )}
            
            {transcriptHistory.length > 0 && (
              <button
                onClick={clearHistory}
                className="text-sm text-gray-500 hover:text-gray-700 underline"
                title="Clear transcript history"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>
      
      <div className="min-h-[200px] max-h-[400px] overflow-y-auto" ref={scrollRef}>
        {/* Current Interim Results (Live Streaming) */}
        {isStreaming && interimTranscript && (
          <div className="p-4 bg-blue-50 border-l-4 border-blue-500 mb-4">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center animate-pulse">
                  <span className="text-white text-xs">💭</span>
                </div>
              </div>
              <div className="flex-1">
                <p className="text-blue-900 font-medium italic">
                  {interimTranscript}
                  <span className="animate-pulse ml-1">|</span>
                </p>
                <p className="text-blue-600 text-sm mt-1">
                  Interim result - still listening...
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Transcript History */}
        {transcriptHistory.length > 0 ? (
          <div className="space-y-3 p-4">
            {transcriptHistory.map((entry, index) => (
              <div 
                key={entry.id}
                className={`bg-gradient-to-r from-green-50 to-blue-50 rounded-xl p-4 border border-green-100 transition-all duration-500 ${
                  index === 0 ? 'ring-2 ring-green-200 ring-opacity-50' : ''
                }`}
              >
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm">💬</span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="text-gray-900 text-lg leading-relaxed font-medium">
                      "{entry.text}"
                    </p>
                    <div className="mt-2 flex items-center justify-between text-sm text-gray-500">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center">
                          <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Final result
                        </div>
                        {entry.confidence > 0 && (
                          <div className="flex items-center">
                            <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                            </svg>
                            {Math.round(entry.confidence * 100)}% confidence
                          </div>
                        )}
                      </div>
                      <div className="text-gray-400">
                        {entry.timestamp}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full min-h-[160px]">
            <div className="text-center">
              {isStreaming ? (
                <div className="space-y-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center mx-auto">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                  </div>
                  <div>
                    <h4 className="text-lg font-medium text-gray-900 mb-1">Listening...</h4>
                    <p className="text-gray-500">Start speaking to see live transcription</p>
                  </div>
                </div>
              ) : isProcessing ? (
                <div className="space-y-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-yellow-100 to-orange-100 rounded-full flex items-center justify-center mx-auto">
                    <div className="w-6 h-6 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                  <div>
                    <h4 className="text-lg font-medium text-gray-900 mb-1">Processing speech...</h4>
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
                      Your spoken words will appear here. Try the streaming mode for real-time results!
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Statistics */}
      {transcriptHistory.length > 0 && (
        <div className="card-footer">
          <div className="flex items-center justify-between text-sm text-gray-500">
            <span>
              {transcriptHistory.length} transcript{transcriptHistory.length !== 1 ? 's' : ''}
            </span>
            {transcriptHistory.length > 0 && (
              <span>
                Average confidence: {Math.round(
                  transcriptHistory.reduce((sum, entry) => sum + entry.confidence, 0) / transcriptHistory.length * 100
                )}%
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default StreamingTranscriptDisplay;