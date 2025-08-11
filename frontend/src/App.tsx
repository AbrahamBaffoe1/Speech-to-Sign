import { useState, useRef, useCallback } from 'react';
import AudioRecorder from './components/AudioRecorder';
import VideoPlayer from './components/VideoPlayer';
import TranscriptDisplay from './components/TranscriptDisplay';
import ControlPanel from './components/ControlPanel';
import StatusIndicator from './components/StatusIndicator';
import ErrorBoundary from './components/ErrorBoundary';
import ErrorDisplay from './components/ErrorDisplay';
import MobileOptimizedLayout from './components/MobileOptimizedLayout';
import { SignVideo } from './types/types';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001';

interface ProcessingState {
  isRecording: boolean;
  isProcessing: boolean;
  currentTranscript: string;
  signVideos: SignVideo[];
  captions: string[];
  confidence: number;
  error: {
    type?: string;
    message: string;
    suggestions?: string[];
    timestamp?: string;
    errorId?: string;
  } | null;
}

function App() {
  const [state, setState] = useState<ProcessingState>({
    isRecording: false,
    isProcessing: false,
    currentTranscript: '',
    signVideos: [],
    captions: [],
    confidence: 0,
    error: null
  });

  const [playbackSettings, setPlaybackSettings] = useState({
    speed: 1.0,
    volume: 1.0,
    showCaptions: true
  });

  const audioRecorderRef = useRef<any>(null);

  const handleRecordingStart = useCallback(() => {
    setState(prev => ({
      ...prev,
      isRecording: true,
      error: null,
      currentTranscript: '',
      signVideos: [],
      captions: []
    }));
  }, []);

  const handleRecordingStop = useCallback(async (audioBlob: Blob) => {
    setState(prev => ({ ...prev, isRecording: false, isProcessing: true }));

    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');

      const response = await fetch(`${API_BASE_URL}/api/speech-to-signs`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      setState(prev => ({
        ...prev,
        isProcessing: false,
        currentTranscript: result.transcript,
        signVideos: result.mappedSigns || [],
        captions: result.captions || [],
        confidence: result.confidence || 0
      }));
    } catch (error) {
      console.error('Processing error:', error);
      
      let errorObj: {
        type?: string;
        message: string;
        suggestions?: string[];
        timestamp?: string;
        errorId?: string;
      } = {
        message: 'Speech processing failed. Please try again.',
        type: 'SPEECH_RECOGNITION_FAILED',
        timestamp: new Date().toISOString()
      };

      // Handle network errors
      if (error instanceof Error) {
        if (error.message.includes('Failed to fetch')) {
          errorObj = {
            message: 'Unable to connect to the server. Please check your internet connection.',
            type: 'NETWORK_CONNECTION_FAILED',
            suggestions: [
              'Check your internet connection',
              'Try refreshing the page',
              'Ensure the server is running'
            ],
            timestamp: new Date().toISOString()
          };
        }
      }

      // Handle API error responses
      if (error instanceof Response) {
        try {
          const errorData = await error.json();
          if (errorData.error) {
            errorObj = {
              message: errorData.error.message || errorData.error,
              type: errorData.error.type || 'UNKNOWN_ERROR',
              suggestions: errorData.error.suggestions,
              errorId: errorData.error.errorId,
              timestamp: errorData.error.timestamp || new Date().toISOString()
            };
          }
        } catch {
          // Fallback if response is not JSON
          errorObj.message = `Server error (${error.status}): ${error.statusText}`;
        }
      }

      setState(prev => ({
        ...prev,
        isProcessing: false,
        error: errorObj
      }));
    }
  }, []);

  const handleTextInput = useCallback(async (text: string) => {
    if (!text.trim()) return;

    setState(prev => ({ ...prev, isProcessing: true, error: null }));

    try {
      const response = await fetch(`${API_BASE_URL}/api/map`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      setState(prev => ({
        ...prev,
        isProcessing: false,
        currentTranscript: text,
        signVideos: result.mappedSigns || [],
        captions: result.captions || [],
        confidence: result.confidence || 0
      }));
    } catch (error) {
      console.error('Mapping error:', error);
      setState(prev => ({
        ...prev,
        isProcessing: false,
        error: {
          message: error instanceof Error ? error.message : 'Text mapping failed',
          type: 'MAPPING_NOT_FOUND',
          timestamp: new Date().toISOString()
        }
      }));
    }
  }, []);

  const handleClearAll = useCallback(() => {
    setState({
      isRecording: false,
      isProcessing: false,
      currentTranscript: '',
      signVideos: [],
      captions: [],
      confidence: 0,
      error: null
    });
  }, []);

  const handleRetry = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  return (
    <ErrorBoundary>
      <MobileOptimizedLayout>
        {/* Header */}
        <header className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-purple-600/10"></div>
          <div className="relative mobile-container mobile-padding py-8 sm:py-12">
            <div className="text-center">
              <h1 className="text-2xl sm:text-4xl lg:text-6xl font-display font-bold text-gradient-animated mb-3 sm:mb-4">
                🎤➡️🤟 Speech to Sign
              </h1>
              <p className="mobile-text text-gray-600 max-w-2xl mx-auto leading-relaxed">
                Real-time speech to sign language translation for accessible communication
              </p>
              <div className="mt-4 sm:mt-8 flex flex-col sm:flex-row justify-center items-center space-y-2 sm:space-y-0 sm:space-x-4">
                <div className="flex items-center text-sm text-gray-500">
                  <span className="status-dot status-success mr-2"></span>
                  System Online
                </div>
                <div className="text-gray-300 hidden sm:block">•</div>
                <div className="text-sm text-gray-500">
                  {state.signVideos.length > 0 ? `${state.signVideos.length} signs ready` : 'Ready to translate'}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="mobile-container mobile-padding pb-8 sm:pb-16">
          {/* Status Indicator */}
          <div className="mb-6 sm:mb-8">
            <StatusIndicator
              isRecording={state.isRecording}
              isProcessing={state.isProcessing}
              confidence={state.confidence}
              error={state.error}
            />
          </div>

          {/* Input Section */}
          <div className="mobile-grid gap-4 sm:gap-6 lg:gap-8 mb-6 sm:mb-8">
            {/* Voice Input */}
            <div className="card-mobile sm:card">
              <div className="card-header">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 flex flex-col sm:flex-row sm:items-center">
                  <span>🎤 Voice Input</span>
                  {state.isRecording && (
                    <span className="mt-1 sm:mt-0 sm:ml-2 px-2 py-1 text-xs bg-red-100 text-red-700 rounded-full animate-pulse self-start">
                      Recording
                    </span>
                  )}
                </h3>
              </div>
              <AudioRecorder
                ref={audioRecorderRef}
                onRecordingStart={handleRecordingStart}
                onRecordingStop={handleRecordingStop}
                isDisabled={state.isProcessing}
              />
            </div>

            {/* Text Input */}
            <div className="card-mobile sm:card">
              <div className="card-header">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 flex items-center">
                  ⌨️ Text Input
                </h3>
              </div>
              <div className="space-y-3 sm:space-y-4">
                <input
                  type="text"
                  placeholder="Type your message here and press Enter..."
                  disabled={state.isProcessing || state.isRecording}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                      handleTextInput(e.currentTarget.value);
                      e.currentTarget.value = '';
                    }
                  }}
                  className="w-full px-3 sm:px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 disabled:bg-gray-100 disabled:cursor-not-allowed touch-target"
                />
                <div className="text-sm text-gray-500">
                  Try: "hello", "thank you", "help", "yes", "no"
                </div>
              </div>
            </div>
          </div>

          {/* Transcript Display */}
          <div className="mb-6 sm:mb-8">
            <TranscriptDisplay
              transcript={state.currentTranscript}
              isProcessing={state.isProcessing}
            />
          </div>

          {/* Video Player */}
          <div className="mb-6 sm:mb-8">
            <VideoPlayer
              signVideos={state.signVideos}
              captions={state.captions}
              playbackSettings={playbackSettings}
              showCaptions={playbackSettings.showCaptions}
            />
          </div>

          {/* Control Panel */}
          <div className="mb-6 sm:mb-8">
            <ControlPanel
              playbackSettings={playbackSettings}
              onSettingsChange={setPlaybackSettings}
              onClear={handleClearAll}
              onRetry={handleRetry}
              hasContent={state.signVideos.length > 0 || state.currentTranscript.length > 0}
              hasError={!!state.error}
            />
          </div>

          {/* Error Display */}
          {state.error && (
            <div className="mb-6 sm:mb-8">
              <ErrorDisplay
                error={state.error}
                onRetry={handleRetry}
                onDismiss={() => setState(prev => ({ ...prev, error: null }))}
              />
            </div>
          )}
        </main>

        {/* Footer */}
        <footer className="bg-gray-900 text-white">
          <div className="mobile-container mobile-padding py-8 sm:py-12">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
              <div>
                <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">About This Tool</h3>
                <p className="text-gray-300 text-sm sm:text-base leading-relaxed">
                  Built for accessibility and inclusion. This tool converts speech to sign language video 
                  to bridge communication gaps for the Deaf and hard-of-hearing community.
                </p>
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Important Notice</h3>
                <p className="text-gray-300 text-sm sm:text-base leading-relaxed">
                  For critical communication (medical, legal, emergency), please consult a certified 
                  sign language interpreter. This tool is designed to assist with basic communication.
                </p>
              </div>
            </div>
            <div className="border-t border-gray-800 mt-6 sm:mt-8 pt-6 sm:pt-8 text-center text-sm text-gray-400">
              <p>Built with ❤️ for accessibility • Open source • Made for everyone</p>
            </div>
          </div>
        </footer>
      </MobileOptimizedLayout>
    </ErrorBoundary>
  );
}

export default App;
