import React, { useState } from 'react';
import { ControlPanelProps } from '../types/types';

const ControlPanel: React.FC<ControlPanelProps> = ({
  playbackSettings,
  onSettingsChange,
  onClear,
  onRetry,
  hasContent,
  hasError
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleSpeedChange = (speed: number) => {
    onSettingsChange({
      ...playbackSettings,
      speed
    });
  };

  const handleVolumeChange = (volume: number) => {
    onSettingsChange({
      ...playbackSettings,
      volume
    });
  };

  const handleCaptionsToggle = () => {
    onSettingsChange({
      ...playbackSettings,
      showCaptions: !playbackSettings.showCaptions
    });
  };

  return (
    <div className="card">
      <div className="card-header">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between text-lg font-semibold text-gray-900 hover:text-blue-600 transition-colors duration-200"
          aria-label={isExpanded ? 'Collapse controls' : 'Expand controls'}
        >
          <span className="flex items-center">
            ⚙️ Settings & Controls
          </span>
          <span className={`transform transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </span>
        </button>
      </div>

      {/* Quick Actions - Always Visible */}
      <div className="flex items-center justify-center space-x-3 mb-4">
        {hasError && (
          <button
            onClick={onRetry}
            className="btn btn-secondary flex items-center space-x-2"
            title="Retry processing"
          >
            <span>🔄</span>
            <span>Retry</span>
          </button>
        )}
        
        {hasContent && (
          <button
            onClick={onClear}
            className="btn btn-danger flex items-center space-x-2"
            title="Clear all content"
          >
            <span>🗑️</span>
            <span>Clear All</span>
          </button>
        )}
        
        {!hasError && !hasContent && (
          <div className="text-gray-500 text-sm">
            No actions available
          </div>
        )}
      </div>

      {/* Expandable Settings */}
      {isExpanded && (
        <div className="space-y-6 border-t border-gray-200 pt-6 animate-slide-up">
          {/* Playback Speed */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-900">
              Playback Speed: <span className="font-bold text-blue-600">{playbackSettings.speed}x</span>
            </label>
            <input
              type="range"
              min="0.5"
              max="2"
              step="0.1"
              value={playbackSettings.speed}
              onChange={(e) => handleSpeedChange(parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
            />
            <div className="flex flex-wrap gap-2 mt-3">
              {[0.5, 0.75, 1.0, 1.25, 1.5, 2.0].map((speed) => (
                <button
                  key={speed}
                  onClick={() => handleSpeedChange(speed)}
                  className={`px-3 py-1 text-xs rounded-full font-medium transition-all duration-200 ${
                    playbackSettings.speed === speed
                      ? 'bg-blue-500 text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {speed}x
                </button>
              ))}
            </div>
          </div>

          {/* Volume */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-900">
              Volume: <span className="font-bold text-green-600">{Math.round(playbackSettings.volume * 100)}%</span>
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={playbackSettings.volume}
              onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
            />
          </div>

          {/* Captions Toggle */}
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-900">
              Show Captions
            </label>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={playbackSettings.showCaptions}
                onChange={handleCaptionsToggle}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>
      )}
    </div>
  );
};

export default ControlPanel;