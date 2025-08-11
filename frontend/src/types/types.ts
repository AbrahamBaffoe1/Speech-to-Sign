export interface SignVideo {
  url: string;
  filename: string;
  duration: number;
}

export interface PlaybackSettings {
  speed: number;
  volume: number;
  showCaptions: boolean;
}

export interface TranscriptionResult {
  transcript: string;
  timestamp: string;
}

export interface MappingResult {
  originalText: string;
  mappedSigns: SignVideo[];
  captions: string[];
  confidence: number;
  timestamp: string;
}

export interface CombinedResult extends TranscriptionResult, MappingResult {
  processingTime: number;
  matchedPhrases: string[];
}

export interface VocabularyEntry {
  phrase: string;
  gloss: string;
  category: string;
  videoFile: string;
  spokenVariants: string[];
  duration: number;
}

export interface AudioRecorderProps {
  onRecordingStart: () => void;
  onRecordingStop: (audioBlob: Blob) => void;
  isDisabled: boolean;
}

export interface VideoPlayerProps {
  signVideos: SignVideo[];
  captions: string[];
  playbackSettings: PlaybackSettings;
  showCaptions: boolean;
}

export interface TranscriptDisplayProps {
  transcript: string;
  isProcessing: boolean;
}

export interface ControlPanelProps {
  playbackSettings: PlaybackSettings;
  onSettingsChange: (settings: PlaybackSettings) => void;
  onClear: () => void;
  onRetry: () => void;
  hasContent: boolean;
  hasError: boolean;
}

export interface StatusIndicatorProps {
  isRecording: boolean;
  isProcessing: boolean;
  confidence: number;
  error: {
    type?: string;
    message: string;
    suggestions?: string[];
    timestamp?: string;
    errorId?: string;
  } | null;
}