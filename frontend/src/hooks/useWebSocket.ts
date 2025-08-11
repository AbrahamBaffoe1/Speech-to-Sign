import { useEffect, useRef, useState, useCallback } from 'react';
import io from 'socket.io-client';

type SocketType = ReturnType<typeof io>;

interface StreamingResult {
  transcript: string;
  confidence: number;
  isFinal: boolean;
  timestamp: string;
}

interface SignsResult {
  originalText: string;
  mappedSigns: any[];
  captions: string[];
  confidence: number;
  timestamp: string;
}

interface StreamingError {
  message: string;
  error?: string;
}

interface WebSocketConfig {
  serverUrl?: string;
  autoConnect?: boolean;
  encoding?: string;
  sampleRate?: number;
  languageCode?: string;
  interimResults?: boolean;
}

interface WebSocketHook {
  socket: SocketType | null;
  isConnected: boolean;
  isStreaming: boolean;
  error: string | null;
  startStreaming: (options?: any) => Promise<void>;
  stopStreaming: () => void;
  sendAudioData: (audioData: any) => void;
  onTranscriptUpdate: (callback: (result: StreamingResult) => void) => void;
  onSignsUpdate: (callback: (result: SignsResult) => void) => void;
  onError: (callback: (error: StreamingError) => void) => void;
  clearError: () => void;
}

export const useWebSocket = (config: WebSocketConfig = {}): WebSocketHook => {
  const {
    serverUrl = process.env.REACT_APP_SERVER_URL || 'http://localhost:3001',
    autoConnect = true,
    encoding = 'WEBM_OPUS',
    sampleRate = 48000,
    languageCode = 'en-US',
    interimResults = true
  } = config;

  const socketRef = useRef<SocketType | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Callback refs to maintain stable references
  const transcriptCallbackRef = useRef<((result: StreamingResult) => void) | null>(null);
  const signsCallbackRef = useRef<((result: SignsResult) => void) | null>(null);
  const errorCallbackRef = useRef<((error: StreamingError) => void) | null>(null);

  // Initialize socket connection
  useEffect(() => {
    if (autoConnect && !socketRef.current) {
      const socket = io(serverUrl, {
        autoConnect: true,
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5,
        timeout: 20000,
        transports: ['websocket', 'polling']
      });

      socketRef.current = socket;

      // Connection event handlers
      socket.on('connect', () => {
        console.log('WebSocket connected:', socket.id);
        setIsConnected(true);
        setError(null);
      });

      socket.on('disconnect', (reason: string) => {
        console.log('WebSocket disconnected:', reason);
        setIsConnected(false);
        setIsStreaming(false);
      });

      socket.on('connect_error', (err: any) => {
        console.error('WebSocket connection error:', err);
        setError(`Connection failed: ${err.message}`);
        setIsConnected(false);
      });

      // Streaming event handlers
      socket.on('streaming-started', (data: any) => {
        console.log('Streaming started:', data);
        setIsStreaming(true);
        setError(null);
      });

      socket.on('streaming-stopped', () => {
        console.log('Streaming stopped');
        setIsStreaming(false);
      });

      socket.on('streaming-ended', () => {
        console.log('Streaming ended by server');
        setIsStreaming(false);
      });

      socket.on('streaming-error', (errorData: StreamingError) => {
        console.error('Streaming error:', errorData);
        setError(errorData.message);
        setIsStreaming(false);
        if (errorCallbackRef.current) {
          errorCallbackRef.current(errorData);
        }
      });

      // Transcript updates
      socket.on('transcript-update', (result: StreamingResult) => {
        if (transcriptCallbackRef.current) {
          transcriptCallbackRef.current(result);
        }
      });

      // Signs mapping updates
      socket.on('signs-update', (result: SignsResult) => {
        if (signsCallbackRef.current) {
          signsCallbackRef.current(result);
        }
      });

      // General errors
      socket.on('error', (errorData: StreamingError) => {
        console.error('Socket error:', errorData);
        setError(errorData.message);
        if (errorCallbackRef.current) {
          errorCallbackRef.current(errorData);
        }
      });

      socket.on('mapping-error', (errorData: StreamingError) => {
        console.error('Mapping error:', errorData);
        setError(`Sign mapping failed: ${errorData.message}`);
        if (errorCallbackRef.current) {
          errorCallbackRef.current(errorData);
        }
      });
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setIsConnected(false);
        setIsStreaming(false);
      }
    };
  }, [serverUrl, autoConnect]);

  // Start streaming
  const startStreaming = useCallback(async (options = {}) => {
    if (!socketRef.current || !isConnected) {
      throw new Error('WebSocket not connected');
    }

    if (isStreaming) {
      console.warn('Streaming already active');
      return;
    }

    const streamOptions = {
      encoding,
      sampleRate,
      languageCode,
      interimResults,
      ...options
    };

    console.log('Starting streaming with options:', streamOptions);
    
    return new Promise<void>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error('Streaming start timeout'));
      }, 10000);

      const onStreamingStarted = () => {
        clearTimeout(timeoutId);
        socketRef.current?.off('streaming-started', onStreamingStarted);
        socketRef.current?.off('streaming-error', onStreamingError);
        resolve();
      };

      const onStreamingError = (errorData: StreamingError) => {
        clearTimeout(timeoutId);
        socketRef.current?.off('streaming-started', onStreamingStarted);
        socketRef.current?.off('streaming-error', onStreamingError);
        reject(new Error(errorData.message));
      };

      if (socketRef.current) {
        socketRef.current.once('streaming-started', onStreamingStarted);
        socketRef.current.once('streaming-error', onStreamingError);
        socketRef.current.emit('start-streaming', streamOptions);
      }
    });
  }, [isConnected, isStreaming, encoding, sampleRate, languageCode, interimResults]);

  // Stop streaming
  const stopStreaming = useCallback(() => {
    if (socketRef.current && isStreaming) {
      console.log('Stopping streaming');
      socketRef.current.emit('stop-streaming');
    }
  }, [isStreaming]);

  // Send audio data
  const sendAudioData = useCallback((audioData: any) => {
    if (socketRef.current && isStreaming) {
      socketRef.current.emit('audio-data', audioData);
    } else {
      console.warn('Cannot send audio data: not streaming or not connected');
    }
  }, [isStreaming]);

  // Set callback functions
  const onTranscriptUpdate = useCallback((callback: (result: StreamingResult) => void) => {
    transcriptCallbackRef.current = callback;
  }, []);

  const onSignsUpdate = useCallback((callback: (result: SignsResult) => void) => {
    signsCallbackRef.current = callback;
  }, []);

  const onError = useCallback((callback: (error: StreamingError) => void) => {
    errorCallbackRef.current = callback;
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    socket: socketRef.current,
    isConnected,
    isStreaming,
    error,
    startStreaming,
    stopStreaming,
    sendAudioData,
    onTranscriptUpdate,
    onSignsUpdate,
    onError,
    clearError
  };
};