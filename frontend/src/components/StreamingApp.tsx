import { useState, useRef, useCallback } from 'react';
import AudioRecorder from './AudioRecorder';
import StreamingAudioRecorder from './StreamingAudioRecorder';
import VideoPlayer from './VideoPlayer';
import TranscriptDisplay from './TranscriptDisplay';
import StreamingTranscriptDisplay from './StreamingTranscriptDisplay';
import ControlPanel from './ControlPanel';
import StatusIndicator from './StatusIndicator';
import ErrorBoundary from './ErrorBoundary';
import ErrorDisplay from './ErrorDisplay';
import { SignVideo } from '../types/types';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001';

interface ProcessingState {
  isRecording: boolean;
  isProcessing: boolean;
  isStreaming: boolean;
  currentTranscript: string;
  interimTranscript: string;
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

function StreamingApp() {
  const [streamingMode, setStreamingMode] = useState(true); // Default to streaming mode
  const [state, setState] = useState<ProcessingState>({
    isRecording: false,
    isProcessing: false,
    isStreaming: false,
    currentTranscript: '',
    interimTranscript: '',
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

  // Traditional recording handlers
  const handleRecordingStart = useCallback(() => {
    setState(prev => ({
      ...prev,
      isRecording: true,
      error: null,
      currentTranscript: '',
      interimTranscript: '',
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
      setState(prev => ({
        ...prev,
        isProcessing: false,
        error: {
          message: 'Speech processing failed. Please try again.',
          type: 'SPEECH_RECOGNITION_FAILED',
          timestamp: new Date().toISOString()
        }
      }));
    }
  }, []);

  // Streaming handlers
  const handleStreamingTranscriptUpdate = useCallback((transcript: string, isFinal: boolean, confidence: number) => {
    setState(prev => ({
      ...prev,
      interimTranscript: isFinal ? '' : transcript,
      currentTranscript: isFinal ? transcript : prev.currentTranscript,
      confidence,
      isStreaming: true
    }));
  }, []);

  const handleStreamingSignsUpdate = useCallback((signs: any[], captions: string[], originalText: string) => {
    setState(prev => ({
      ...prev,
      signVideos: signs,
      captions,
      currentTranscript: originalText
    }));
  }, []);

  const handleStreamingError = useCallback((error: string) => {
    setState(prev => ({
      ...prev,
      error: {
        message: error,
        type: 'STREAMING_ERROR',
        timestamp: new Date().toISOString()
      },
      isStreaming: false
    }));
  }, []);

  // Text input handler
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
      isStreaming: false,
      currentTranscript: '',
      interimTranscript: '',
      signVideos: [],
      captions: [],
      confidence: 0,
      error: null
    });
  }, []);

  const handleRetry = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  const handleModeToggle = useCallback(() => {
    setStreamingMode(prev => !prev);
    handleClearAll();
  }, [handleClearAll]);

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        {/* Header */}
        <header className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-purple-600/10"></div>
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="text-center">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-bold text-gradient-animated mb-4">
                🎤➡️🤟 Speech to Sign
              </h1>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
                Real-time speech to sign language translation for accessible communication
              </p>
              
              {/* Mode Toggle */}
              <div className="mt-6 flex justify-center">
                <div className="bg-white rounded-full p-1 shadow-lg border border-gray-200">
                  <button
                    onClick={handleModeToggle}
                    className={`px-6 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                      !streamingMode 
                        ? 'bg-blue-500 text-white shadow-md' 
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    📼 Traditional
                  </button>
                  <button
                    onClick={handleModeToggle}
                    className={`px-6 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                      streamingMode 
                        ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-md' 
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    🔴 Live Streaming
                  </button>
                </div>
              </div>
              
              <div className="mt-6 flex justify-center items-center space-x-4">
                <div className="flex items-center text-sm text-gray-500">
                  <span className="status-dot status-success mr-2"></span>
                  {streamingMode ? 'Streaming Mode' : 'Traditional Mode'}
                </div>
                <div className="text-gray-300">•</div>
                <div className="text-sm text-gray-500">
                  {state.signVideos.length > 0 ? `${state.signVideos.length} signs ready` : 'Ready to translate'}
                </div>
                {streamingMode && (
                  <>
                    <div className="text-gray-300">•</div>
                    <div className="text-sm text-purple-600 font-medium">
                      Real-time recognition
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
          {/* Status Indicator */}
          <div className="mb-8">
            <StatusIndicator
              isRecording={state.isRecording || state.isStreaming}
              isProcessing={state.isProcessing}
              confidence={state.confidence}
              error={state.error}
            />
          </div>

          {/* Input Section */}
          <div className="grid lg:grid-cols-2 gap-8 mb-8">
            {/* Voice Input */}
            <div className="card">
              <div className="card-header">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  {streamingMode ? '🔴 Live Voice Input' : '🎤 Voice Input'}
                  {(state.isRecording || state.isStreaming) && (
                    <span className="ml-2 px-2 py-1 text-xs bg-red-100 text-red-700 rounded-full animate-pulse">
                      {streamingMode ? 'Streaming' : 'Recording'}
                    </span>
                  )}
                </h3>
              </div>
              
              {streamingMode ? (
                <StreamingAudioRecorder
                  onTranscriptUpdate={handleStreamingTranscriptUpdate}
                  onSignsUpdate={handleStreamingSignsUpdate}
                  onError={handleStreamingError}
                  isDisabled={state.isProcessing}
                />
              ) : (
                <AudioRecorder
                  ref={audioRecorderRef}
                  onRecordingStart={handleRecordingStart}
                  onRecordingStop={handleRecordingStop}
                  isDisabled={state.isProcessing}
                />
              )}
            </div>

            {/* Text Input */}
            <div className="card">
              <div className="card-header">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  ⌨️ Text Input
                </h3>
              </div>
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Type your message here and press Enter..."
                  disabled={state.isProcessing || state.isRecording || state.isStreaming}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                      handleTextInput(e.currentTarget.value);
                      e.currentTarget.value = '';
                    }
                  }}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
                <div className="text-sm text-gray-500">
                  Try: "hello", "thank you", "help", "yes", "no"
                </div>
              </div>
            </div>
          </div>

          {/* Transcript Display */}
          <div className="mb-8">
            {streamingMode ? (
              <StreamingTranscriptDisplay
                interimTranscript={state.interimTranscript}
                finalTranscript={state.currentTranscript}
                confidence={state.confidence}
                isStreaming={state.isStreaming}
                isProcessing={state.isProcessing}
              />
            ) : (
              <TranscriptDisplay
                transcript={state.currentTranscript}
                isProcessing={state.isProcessing}
              />
            )}
          </div>

          {/* Video Player */}
          <div className="mb-8">
            <VideoPlayer
              signVideos={state.signVideos}
              captions={state.captions}
              playbackSettings={playbackSettings}
              showCaptions={playbackSettings.showCaptions}
            />
          </div>

          {/* Control Panel */}
          <div className="mb-8">
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
            <div className="mb-8">
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
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="grid md:grid-cols-3 gap-8">
              <div>
                <h3 className="text-lg font-semibold mb-4">About This Tool</h3>
                <p className="text-gray-300 leading-relaxed">
                  Built for accessibility and inclusion. This tool converts speech to sign language video 
                  to bridge communication gaps for the Deaf and hard-of-hearing community.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-4">Streaming Mode</h3>
                <p className="text-gray-300 leading-relaxed">
                  Real-time speech recognition provides instant feedback and live transcription.
                  Perfect for natural conversations and immediate translation needs.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-4">Important Notice</h3>
                <p className="text-gray-300 leading-relaxed">
                  For critical communication (medical, legal, emergency), please consult a certified 
                  sign language interpreter. This tool is designed to assist with basic communication.
                </p>
              </div>
            </div>
            <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm text-gray-400">
              <p>Built with ❤️ for accessibility • Real-time streaming enabled • Made for everyone</p>
            </div>
          </div>
        </footer>
      </div>
    </ErrorBoundary>
  );
}

export default StreamingApp;