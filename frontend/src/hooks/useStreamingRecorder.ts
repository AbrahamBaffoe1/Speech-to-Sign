import { useState, useRef, useCallback, useEffect } from 'react';

interface StreamingRecorderConfig {
  onAudioData: (audioData: ArrayBuffer) => void;
  onError?: (error: Error) => void;
  audioConstraints?: MediaStreamConstraints['audio'];
  chunkInterval?: number; // ms between sending chunks
}

interface StreamingRecorder {
  isRecording: boolean;
  hasPermission: boolean | null;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  requestPermission: () => Promise<boolean>;
  error: string | null;
}

export const useStreamingRecorder = (config: StreamingRecorderConfig): StreamingRecorder => {
  const {
    onAudioData,
    onError,
    audioConstraints = {
      echoCancellation: true,
      noiseSuppression: true,
      sampleRate: 48000,
      channelCount: 1
    },
    chunkInterval = 250 // Send audio chunks every 250ms for real-time streaming
  } = config;

  const [isRecording, setIsRecording] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: audioConstraints
      });
      
      setHasPermission(true);
      setError(null);
      
      // Stop the test stream
      stream.getTracks().forEach(track => track.stop());
      return true;
    } catch (err) {
      console.error('Microphone permission denied:', err);
      setHasPermission(false);
      setError('Microphone permission denied');
      if (onError) {
        onError(err as Error);
      }
      return false;
    }
  }, [audioConstraints, onError]);

  const startRecording = useCallback(async (): Promise<void> => {
    if (isRecording) {
      console.warn('Recording already in progress');
      return;
    }

    try {
      // Request permission if not already granted
      if (hasPermission !== true) {
        const granted = await requestPermission();
        if (!granted) {
          throw new Error('Microphone permission required');
        }
      }

      // Get media stream
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: audioConstraints
      });

      streamRef.current = stream;

      // Create MediaRecorder for streaming
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      mediaRecorderRef.current = mediaRecorder;

      // Handle audio data
      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          // Convert blob to ArrayBuffer and send
          event.data.arrayBuffer().then(arrayBuffer => {
            if (arrayBuffer.byteLength > 0) {
              onAudioData(arrayBuffer);
            }
          }).catch(err => {
            console.error('Failed to convert audio data:', err);
            if (onError) {
              onError(err);
            }
          });
        }
      };

      mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event);
        const errorMessage = 'MediaRecorder error occurred';
        setError(errorMessage);
        if (onError) {
          onError(new Error(errorMessage));
        }
        setIsRecording(false);
      };

      mediaRecorder.onstop = () => {
        console.log('MediaRecorder stopped');
        setIsRecording(false);
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      };

      // Start recording
      mediaRecorder.start();
      setIsRecording(true);
      setError(null);

      // Set up interval to request data at regular intervals for streaming
      intervalRef.current = setInterval(() => {
        if (mediaRecorderRef.current && 
            mediaRecorderRef.current.state === 'recording') {
          mediaRecorderRef.current.requestData();
        }
      }, chunkInterval);

      console.log('Streaming recording started');

    } catch (err) {
      console.error('Failed to start recording:', err);
      const errorMessage = `Failed to start recording: ${(err as Error).message}`;
      setError(errorMessage);
      if (onError) {
        onError(err as Error);
      }
      setIsRecording(false);
      
      // Clean up on error
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    }
  }, [isRecording, hasPermission, audioConstraints, chunkInterval, onAudioData, onError, requestPermission]);

  const stopRecording = useCallback(() => {
    if (!isRecording) {
      console.warn('Not currently recording');
      return;
    }

    console.log('Stopping streaming recording');

    // Stop the interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Stop MediaRecorder
    if (mediaRecorderRef.current && 
        mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    // Stop media stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    mediaRecorderRef.current = null;
    setIsRecording(false);
    setError(null);
  }, [isRecording]);

  // Auto-request permission on first use
  useEffect(() => {
    if (hasPermission === null) {
      requestPermission();
    }
  }, [hasPermission, requestPermission]);

  return {
    isRecording,
    hasPermission,
    startRecording,
    stopRecording,
    requestPermission,
    error
  };
};