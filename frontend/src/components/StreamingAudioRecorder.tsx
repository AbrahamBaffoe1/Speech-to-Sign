import React, { useState, useEffect, useCallback } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';
import { useStreamingRecorder } from '../hooks/useStreamingRecorder';

interface StreamingAudioRecorderProps {
  onTranscriptUpdate?: (transcript: string, isFinal: boolean, confidence: number) => void;
  onSignsUpdate?: (signs: any[], captions: string[], originalText: string) => void;
  onError?: (error: string) => void;
  isDisabled?: boolean;
  className?: string;
}

interface TranscriptState {
  interim: string;
  final: string;
  confidence: number;
  timestamp: string;
}

const StreamingAudioRecorder: React.FC<StreamingAudioRecorderProps> = ({
  onTranscriptUpdate,
  onSignsUpdate,
  onError,
  isDisabled = false,
  className = ""
}) => {
  const [transcript, setTranscript] = useState<TranscriptState>({
    interim: '',
    final: '',
    confidence: 0,
    timestamp: ''
  });

  // WebSocket connection for real-time streaming
  const {
    isConnected,
    isStreaming,
    error: wsError,
    startStreaming,
    stopStreaming,
    sendAudioData,
    onTranscriptUpdate: onWsTranscriptUpdate,
    onSignsUpdate: onWsSignsUpdate,
    onError: onWsError,
    clearError
  } = useWebSocket({
    autoConnect: true,
    interimResults: true
  });

  // Audio streaming recorder
  const {
    isRecording,
    hasPermission,
    startRecording,
    stopRecording,
    requestPermission,
    error: recorderError
  } = useStreamingRecorder({
    onAudioData: (audioData) => {
      if (isStreamingConfirmed && isConnected) {
        // Convert ArrayBuffer to base64 for WebSocket transmission
        const uint8Array = new Uint8Array(audioData);
        const base64Audio = btoa(String.fromCharCode.apply(null, Array.from(uint8Array)));
        
        console.log('Sending audio data:', {
          arrayBufferSize: audioData.byteLength,
          base64Length: base64Audio.length,
          isStreaming,
          isStreamingConfirmed
        });
        
        sendAudioData(base64Audio);
      } else {
        console.warn('Cannot send audio data - not confirmed streaming or not connected', {
          isStreaming,
          isStreamingConfirmed,
          isConnected
        });
      }
    },
    onError: (error) => {
      console.error('Streaming recorder error:', error);
      if (onError) {
        onError(error.message);
      }
    }
  });

  // Track when streaming actually starts
  const [isStreamingConfirmed, setIsStreamingConfirmed] = useState(false);

  // Set up WebSocket event handlers
  useEffect(() => {
    onWsTranscriptUpdate((result) => {
      const newTranscript = {
        interim: result.isFinal ? '' : result.transcript,
        final: result.isFinal ? result.transcript : transcript.final,
        confidence: result.confidence,
        timestamp: result.timestamp
      };

      setTranscript(newTranscript);

      if (onTranscriptUpdate) {
        onTranscriptUpdate(result.transcript, result.isFinal, result.confidence);
      }
    });

    onWsSignsUpdate((result) => {
      if (onSignsUpdate) {
        onSignsUpdate(result.mappedSigns, result.captions, result.originalText);
      }
    });

    onWsError((error) => {
      console.error('WebSocket streaming error:', error);
      if (onError) {
        onError(error.message);
      }
    });
  }, [onWsTranscriptUpdate, onWsSignsUpdate, onWsError, onTranscriptUpdate, onSignsUpdate, onError, transcript.final]);

  // Update streaming confirmation state
  useEffect(() => {
    if (isStreaming) {
      console.log('Streaming confirmed by WebSocket');
      setIsStreamingConfirmed(true);
    } else {
      setIsStreamingConfirmed(false);
    }
  }, [isStreaming]);

  // Handle start/stop recording
  const handleToggleRecording = useCallback(async () => {
    if (isDisabled) return;

    try {
      if (isRecording) {
        // Stop recording and streaming
        stopRecording();
        if (isStreaming) {
          stopStreaming();
        }
        setTranscript(prev => ({ ...prev, interim: '' }));
      } else {
        // Clear any previous errors
        clearError();
        
        // Check permissions first
        if (hasPermission !== true) {
          const granted = await requestPermission();
          if (!granted) {
            if (onError) {
              onError('Microphone permission is required for streaming recognition');
            }
            return;
          }
        }

        // Start WebSocket streaming first
        console.log('Starting WebSocket streaming...');
        await startStreaming();
        
        // Wait for streaming to be confirmed by the server (up to 3 seconds)
        console.log('Waiting for streaming confirmation...');
        const streamingPromise = new Promise<void>((resolve, reject) => {
          let attempts = 0;
          const maxAttempts = 30; // 3 seconds
          
          const checkInterval = setInterval(() => {
            attempts++;
            console.log(`Streaming confirmation attempt ${attempts}/${maxAttempts}, isStreaming: ${isStreaming}`);
            
            if (isStreaming) {
              clearInterval(checkInterval);
              console.log('Streaming confirmed! Starting audio recording...');
              resolve();
            } else if (attempts >= maxAttempts) {
              clearInterval(checkInterval);
              reject(new Error('Streaming confirmation timeout'));
            }
          }, 100);
        });
        
        await streamingPromise;
        
        // Now start audio recording
        await startRecording();
        
        // Clear previous transcript
        setTranscript({
          interim: '',
          final: '',
          confidence: 0,
          timestamp: ''
        });
      }
    } catch (error) {
      console.error('Failed to toggle recording:', error);
      if (onError) {
        onError((error as Error).message);
      }
    }
  }, [
    isDisabled, 
    isRecording, 
    isStreaming, 
    hasPermission,
    stopRecording, 
    stopStreaming, 
    startStreaming, 
    startRecording,
    requestPermission,
    clearError,
    onError
  ]);

  // Get current error message
  const errorMessage = wsError || recorderError;

  // Permission denied UI
  if (hasPermission === false) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <div className="mb-4">
          <svg className="mx-auto h-16 w-16 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Microphone Access Required</h3>
        <p className="text-gray-500 mb-6">Please grant microphone permission to use real-time speech recognition.</p>
        <button 
          onClick={requestPermission}
          className="btn btn-primary"
        >
          <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
          </svg>
          Grant Permission
        </button>
      </div>
    );
  }

  return (
    <div className={`text-center space-y-6 ${className}`}>
      {/* Connection Status */}
      {!isConnected && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <div className="flex items-center justify-center space-x-2 text-yellow-600">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-600"></div>
            <span className="text-sm font-medium">Connecting to streaming service...</span>
          </div>
        </div>
      )}

      {/* Error Display */}
      {errorMessage && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-center justify-center space-x-2 text-red-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
            <span className="text-sm font-medium">{errorMessage}</span>
          </div>
        </div>
      )}

      {/* Record Button */}
      <div className="relative">
        <button
          onClick={handleToggleRecording}
          disabled={isDisabled || !isConnected || hasPermission === null}
          className={`relative w-24 h-24 rounded-full font-semibold text-white transition-all duration-300 transform focus:outline-none focus:ring-4 focus:ring-offset-2 ${
            isRecording 
              ? 'bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 focus:ring-red-500 animate-pulse shadow-glow' 
              : (isDisabled || !isConnected || hasPermission === null)
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-br from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 focus:ring-blue-500 hover:scale-105 shadow-lg hover:shadow-xl'
          }`}
          aria-label={isRecording ? 'Stop streaming recognition' : 'Start streaming recognition'}
        >
          <div className="flex flex-col items-center justify-center h-full">
            <span className="text-2xl mb-1">
              {isRecording ? '⏹️' : '🎤'}
            </span>
            <span className="text-xs font-medium">
              {isRecording ? 'Stop' : 'Stream'}
            </span>
          </div>
          
          {isRecording && (
            <div className="absolute inset-0 rounded-full border-4 border-red-300 animate-ping"></div>
          )}
        </button>
      </div>
      
      {/* Status Text */}
      <div className="space-y-2">
        {isRecording ? (
          <div className="flex items-center justify-center space-x-2 text-red-600">
            <div className="status-dot status-recording animate-pulse"></div>
            <span className="font-medium">Live streaming in progress...</span>
          </div>
        ) : !isConnected ? (
          <div className="flex items-center justify-center space-x-2 text-yellow-600">
            <div className="status-dot status-processing"></div>
            <span className="font-medium">Connecting...</span>
          </div>
        ) : isDisabled ? (
          <div className="flex items-center justify-center space-x-2 text-gray-500">
            <div className="status-dot status-processing"></div>
            <span className="font-medium">Processing...</span>
          </div>
        ) : (
          <div>
            <p className="text-gray-900 font-medium">Ready for streaming</p>
            <p className="text-sm text-gray-500">Click to start real-time speech recognition</p>
          </div>
        )}
      </div>

      {/* Live Transcript Display */}
      {(transcript.interim || transcript.final || isRecording) && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 min-h-[80px]">
          <div className="text-left space-y-2">
            {transcript.final && (
              <div className="text-slate-900 font-medium">
                {transcript.final}
              </div>
            )}
            {transcript.interim && (
              <div className="text-slate-500 italic">
                {transcript.interim}
                <span className="animate-pulse">|</span>
              </div>
            )}
            {isRecording && !transcript.interim && !transcript.final && (
              <div className="text-slate-400 text-center">
                <span className="animate-pulse">Listening...</span>
              </div>
            )}
            {transcript.confidence > 0 && (
              <div className="text-xs text-slate-400">
                Confidence: {Math.round(transcript.confidence * 100)}%
                {transcript.timestamp && (
                  <span className="ml-2">
                    {new Date(transcript.timestamp).toLocaleTimeString()}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Instructions */}
      {!isRecording && !isDisabled && isConnected && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <h4 className="text-sm font-medium text-blue-900 mb-2">Real-time streaming:</h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Click the microphone to start live recognition</li>
            <li>• Speak naturally - results appear instantly</li>
            <li>• See interim results as you speak</li>
            <li>• Final results are automatically converted to signs</li>
            <li>• Click stop when finished</li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default StreamingAudioRecorder;