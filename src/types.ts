export interface TextFields {
  heading: string;
  name: string;
  extra: string;
  date: string;
}

export interface MediaFileItem {
  name: string;
  path: string;
  duration?: number;
  size?: number;
  isUploaded?: boolean;
  localUrl?: string;
  uploadProgress?: number;
  isUploading?: boolean;
  uploadError?: string | null;
}

export type DurationPreset = 'auto' | '15m' | '30m' | '1h' | '2h' | '3h' | '5h' | 'custom';

export interface RenderState {
  status: 'idle' | 'rendering' | 'completed' | 'error';
  step: string;
  progress: number;
  logs: string[];
  outputFile: string | null;
  error: string | null;
  startedAt: number | null;
  completedAt: number | null;
}

export interface ServerStatusResponse {
  defaultVideos: { name: string; path: string; duration: number }[];
  defaultAudio: { name: string; path: string; duration: number };
  defaultSoundFx?: { name: string; path: string; duration: number };
  hasOverlay: boolean;
  hasFinal: boolean;
  currentRender: RenderState;
}
