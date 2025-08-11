import React, { useState, useRef, useEffect } from 'react';
import { VideoPlayerProps } from '../types/types';

const VideoPlayer: React.FC<VideoPlayerProps> = ({
  signVideos,
  captions,
  playbackSettings,
  showCaptions
}) => {
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (signVideos.length > 0) {
      setCurrentVideoIndex(0);
      setProgress(0);
    }
  }, [signVideos]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackSettings.speed;
      videoRef.current.volume = playbackSettings.volume;
    }
  }, [playbackSettings]);

  const handleVideoEnd = () => {
    if (currentVideoIndex < signVideos.length - 1) {
      setCurrentVideoIndex(prev => prev + 1);
    } else {
      setIsPlaying(false);
      setProgress(100);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const video = videoRef.current;
      const currentTime = video.currentTime;
      const duration = video.duration;
      
      if (duration > 0) {
        const videoProgress = (currentTime / duration) * 100;
        const overallProgress = ((currentVideoIndex + videoProgress / 100) / signVideos.length) * 100;
        setProgress(overallProgress);
      }
    }
  };

  const playSequence = () => {
    if (signVideos.length === 0) return;
    
    setCurrentVideoIndex(0);
    setIsPlaying(true);
    setProgress(0);
    
    if (videoRef.current) {
      videoRef.current.play();
    }
  };

  const pauseSequence = () => {
    setIsPlaying(false);
    if (videoRef.current) {
      videoRef.current.pause();
    }
  };

  const resetSequence = () => {
    setIsPlaying(false);
    setCurrentVideoIndex(0);
    setProgress(0);
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
    }
  };

  const skipToVideo = (index: number) => {
    if (index >= 0 && index < signVideos.length) {
      setCurrentVideoIndex(index);
      if (isPlaying && videoRef.current) {
        videoRef.current.play();
      }
    }
  };

  if (signVideos.length === 0) {
    return (
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            🎬 Sign Language Video
          </h3>
        </div>
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center mb-4">
            <span className="text-3xl">🎯</span>
          </div>
          <h4 className="text-lg font-medium text-gray-900 mb-2">Ready for Translation</h4>
          <p className="text-gray-500 max-w-sm">
            Sign language videos will appear here after you speak or type your message
          </p>
        </div>
      </div>
    );
  }

  const currentVideo = signVideos[currentVideoIndex];
  const currentCaption = captions[currentVideoIndex] || '';

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center justify-between">
          <span className="flex items-center">
            🎬 Sign Language Video
            {isPlaying && (
              <span className="ml-2 px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full animate-pulse">
                Playing
              </span>
            )}
          </span>
          <span className="text-sm font-normal text-gray-500">
            {currentVideoIndex + 1} of {signVideos.length}
          </span>
        </h3>
      </div>

      {/* Video Container */}
      <div className="relative bg-black rounded-xl overflow-hidden mb-6 aspect-video">
        <video
          ref={videoRef}
          src={currentVideo.url}
          onEnded={handleVideoEnd}
          onTimeUpdate={handleTimeUpdate}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          className="w-full h-full object-cover"
          poster="/placeholder-sign.jpg"
          preload="metadata"
        />
        
        {/* Video Caption Overlay */}
        {showCaptions && currentCaption && (
          <div className="absolute bottom-4 left-4 right-4">
            <div className="bg-black/80 backdrop-blur-sm text-white px-4 py-2 rounded-lg text-center font-medium">
              {currentCaption}
            </div>
          </div>
        )}
        
        {/* Play/Pause Overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 hover:opacity-100 transition-opacity duration-200">
          <button
            onClick={isPlaying ? pauseSequence : playSequence}
            className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-all duration-200"
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            <span className="text-2xl">{isPlaying ? '⏸️' : '▶️'}</span>
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-900">Progress</span>
          <span className="text-sm text-gray-500">
            {Math.round(progress)}%
          </span>
        </div>
        <div className="progress-bar">
          <div 
            className="progress-fill" 
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </div>

      {/* Control Buttons */}
      <div className="flex items-center justify-center space-x-4 mb-6">
        <button 
          onClick={resetSequence}
          className="btn btn-secondary flex items-center space-x-2"
          aria-label="Reset to beginning"
        >
          <span>⏮️</span>
          <span>Reset</span>
        </button>
        
        <button
          onClick={isPlaying ? pauseSequence : playSequence}
          className="btn btn-primary flex items-center space-x-2"
          aria-label={isPlaying ? 'Pause' : 'Play all'}
        >
          <span>{isPlaying ? '⏸️' : '▶️'}</span>
          <span>{isPlaying ? 'Pause' : 'Play All'}</span>
        </button>

        <button
          onClick={() => skipToVideo(currentVideoIndex + 1)}
          disabled={currentVideoIndex >= signVideos.length - 1}
          className="btn btn-secondary flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Next video"
        >
          <span>⏭️</span>
          <span>Next</span>
        </button>
      </div>

      {/* Video Sequence List */}
      {signVideos.length > 1 && (
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
            📋 Sign Sequence
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {signVideos.map((video, index) => (
              <button
                key={index}
                onClick={() => skipToVideo(index)}
                className={`p-3 rounded-xl border text-left transition-all duration-200 hover:shadow-md ${
                  index === currentVideoIndex
                    ? 'bg-blue-50 border-blue-200 text-blue-900'
                    : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    index === currentVideoIndex
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-300 text-gray-600'
                  }`}>
                    {index + 1}
                  </span>
                  <span className="text-sm font-medium truncate">
                    {captions[index] || video.filename}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoPlayer;