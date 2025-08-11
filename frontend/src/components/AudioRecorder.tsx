import React, { useState, useRef, forwardRef, useImperativeHandle } from 'react';
import { AudioRecorderProps } from '../types/types';

interface AudioRecorderRef {
  startRecording: () => void;
  stopRecording: () => void;
}

const AudioRecorder = forwardRef<AudioRecorderRef, AudioRecorderProps>(
  ({ onRecordingStart, onRecordingStop, isDisabled }, ref) => {
    const [isRecording, setIsRecording] = useState(false);
    const [hasPermission, setHasPermission] = useState<boolean | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);

    useImperativeHandle(ref, () => ({
      startRecording,
      stopRecording
    }));

    const requestMicrophonePermission = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            sampleRate: 48000
          }
        });
        setHasPermission(true);
        return stream;
      } catch (error) {
        console.error('Microphone permission denied:', error);
        setHasPermission(false);
        return null;
      }
    };

    const startRecording = async () => {
      if (isDisabled || isRecording) return;

      const stream = await requestMicrophonePermission();
      if (!stream) return;

      try {
        chunksRef.current = [];
        const mediaRecorder = new MediaRecorder(stream, {
          mimeType: 'audio/webm;codecs=opus'
        });
        
        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            chunksRef.current.push(event.data);
          }
        };

        mediaRecorder.onstop = () => {
          const audioBlob = new Blob(chunksRef.current, { 
            type: 'audio/webm;codecs=opus' 
          });
          onRecordingStop(audioBlob);
          stream.getTracks().forEach(track => track.stop());
        };

        mediaRecorderRef.current = mediaRecorder;
        mediaRecorder.start();
        setIsRecording(true);
        onRecordingStart();
      } catch (error) {
        console.error('Failed to start recording:', error);
        stream.getTracks().forEach(track => track.stop());
      }
    };

    const stopRecording = () => {
      if (!isRecording || !mediaRecorderRef.current) return;

      mediaRecorderRef.current.stop();
      setIsRecording(false);
    };

    const handleButtonClick = () => {
      if (isRecording) {
        stopRecording();
      } else {
        startRecording();
      }
    };

    if (hasPermission === false) {
      return (
        <div className="text-center py-8">
          <div className="mb-4">
            <svg className="mx-auto h-16 w-16 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Microphone Access Required</h3>
          <p className="text-gray-500 mb-6">Please grant microphone permission to use speech recognition.</p>
          <button 
            onClick={requestMicrophonePermission}
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
      <div className="text-center space-y-6">
        {/* Record Button */}
        <div className="relative">
          <button
            onClick={handleButtonClick}
            disabled={isDisabled}
            className={`relative w-24 h-24 rounded-full font-semibold text-white transition-all duration-300 transform focus:outline-none focus:ring-4 focus:ring-offset-2 ${
              isRecording 
                ? 'bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 focus:ring-red-500 animate-recording shadow-glow' 
                : isDisabled
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-br from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 focus:ring-blue-500 hover:scale-105 shadow-lg hover:shadow-xl'
            }`}
            aria-label={isRecording ? 'Stop recording' : 'Start recording'}
          >
            <div className="flex flex-col items-center justify-center h-full">
              <span className="text-2xl mb-1">
                {isRecording ? '⏹️' : '🎤'}
              </span>
              <span className="text-xs font-medium">
                {isRecording ? 'Stop' : 'Record'}
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
              <div className="status-dot status-recording"></div>
              <span className="font-medium">Recording your voice...</span>
            </div>
          ) : isDisabled ? (
            <div className="flex items-center justify-center space-x-2 text-yellow-600">
              <div className="status-dot status-processing"></div>
              <span className="font-medium">Processing...</span>
            </div>
          ) : (
            <div>
              <p className="text-gray-900 font-medium">Ready to record</p>
              <p className="text-sm text-gray-500">Click the microphone to start speaking</p>
            </div>
          )}
        </div>

        {/* Instructions */}
        {!isRecording && !isDisabled && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <h4 className="text-sm font-medium text-blue-900 mb-2">How to use:</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Click the microphone button</li>
              <li>• Speak clearly into your microphone</li>
              <li>• Click stop when finished</li>
              <li>• Your speech will be converted to sign language</li>
            </ul>
          </div>
        )}
      </div>
    );
  }
);

AudioRecorder.displayName = 'AudioRecorder';

export default AudioRecorder;