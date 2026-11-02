import React, { useRef } from 'react';
import {
  FolderOpen,
  Film,
  Music,
  Trees,
  Image as ImageIcon,
  RotateCcw,
  Trash2,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Sliders,
  Volume2,
} from 'lucide-react';
import { MediaFileItem } from '../types';

interface Props {
  videoFiles: MediaFileItem[];
  audioFiles: MediaFileItem[];
  soundFxFiles: MediaFileItem[];
  overlayFile: MediaFileItem | null;
  mainAudioVolume: number;
  soundFxVolume: number;
  hasFinalOutput: boolean;
  onAddVideos: (files: File[]) => void;
  onRemoveVideo: (index: number) => void;
  onAddAudios: (files: File[]) => void;
  onRemoveAudio: (index: number) => void;
  onAddSoundFx: (files: File[]) => void;
  onRemoveSoundFx: (index: number) => void;
  onMainAudioVolumeChange: (vol: number) => void;
  onSoundFxVolumeChange: (vol: number) => void;
  onSetOverlay: (file: File) => void;
  onResetDefaults: () => void;
  disabled?: boolean;
}

export const FilesCard: React.FC<Props> = ({
  videoFiles,
  audioFiles,
  soundFxFiles,
  overlayFile,
  mainAudioVolume,
  soundFxVolume,
  hasFinalOutput,
  onAddVideos,
  onRemoveVideo,
  onAddAudios,
  onRemoveAudio,
  onAddSoundFx,
  onRemoveSoundFx,
  onMainAudioVolumeChange,
  onSoundFxVolumeChange,
  onSetOverlay,
  onResetDefaults,
  disabled,
}) => {
  const videoInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const sfxInputRef = useRef<HTMLInputElement>(null);
  const overlayInputRef = useRef<HTMLInputElement>(null);

  const totalVideoDuration = videoFiles.reduce((acc, v) => acc + (v.duration || 0), 0);
  const totalAudioDuration = audioFiles.reduce((acc, a) => acc + (a.duration || 0), 0);
  const totalSfxDuration = soundFxFiles.reduce((acc, s) => acc + (s.duration || 0), 0);

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onAddVideos(Array.from(e.target.files));
      e.target.value = '';
    }
  };

  const handleAudioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onAddAudios(Array.from(e.target.files));
      e.target.value = '';
    }
  };

  const handleSfxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onAddSoundFx(Array.from(e.target.files));
      e.target.value = '';
    }
  };

  const handleOverlayChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onSetOverlay(e.target.files[0]);
      e.target.value = '';
    }
  };

  return (
    <div className="bg-white rounded-lg border border-[#d8dde5] p-5 shadow-xs flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#eef2f6]">
          <div className="flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-[#0b6bcb]" />
            <h2 className="text-base font-bold text-[#171a1f]">Files &amp; Media</h2>
          </div>
          <button
            type="button"
            disabled={disabled}
            onClick={onResetDefaults}
            className="flex items-center gap-1.5 text-xs text-[#0b6bcb] hover:text-[#084f97] font-semibold px-2 py-1 rounded hover:bg-[#eef3f8] transition-colors disabled:opacity-50"
            title="Reset ke file contoh"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset default
          </button>
        </div>

        {/* Status Box */}
        <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-md p-3 mb-4 font-mono text-xs space-y-1.5 text-[#334155]">
          <div className="flex items-start justify-between">
            <span className="font-semibold text-[#1e293b]">Video ({videoFiles.length}):</span>
            <span className="text-right truncate max-w-[280px]">
              {videoFiles.length > 0
                ? `${videoFiles.map((v) => v.name).join(', ')} (${totalVideoDuration.toFixed(1)}s)`
                : 'Belum dipilih'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-semibold text-[#1e293b]">Audio Utama ({audioFiles.length}):</span>
            <span className="text-right truncate max-w-[280px]">
              {audioFiles.length > 0
                ? `${audioFiles.map((a) => a.name).join(', ')} (${totalAudioDuration.toFixed(1)}s)`
                : 'Belum dipilih'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-semibold text-[#1e293b]">Sound FX ({soundFxFiles.length}):</span>
            <span className="text-right truncate max-w-[280px]">
              {soundFxFiles.length > 0
                ? `${soundFxFiles.map((s) => s.name).join(', ')} (${totalSfxDuration.toFixed(1)}s)`
                : 'Tidak ada (opsional)'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-semibold text-[#1e293b]">Overlay:</span>
            <span>{overlayFile ? overlayFile.name : 'Belum dipilih'}</span>
          </div>
          <div className="flex items-center justify-between pt-1 border-t border-[#e2e8f0]">
            <span className="font-semibold text-[#1e293b]">Result:</span>
            <span
              className={`font-semibold flex items-center gap-1 ${
                hasFinalOutput ? 'text-emerald-600' : 'text-[#64748b]'
              }`}
            >
              {hasFinalOutput ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" /> youtube_ready.mp4 ready
                </>
              ) : (
                'belum dibuat'
              )}
            </span>
          </div>
        </div>

        {/* Video Clips List */}
        <div className="mb-3">
          <div className="flex items-center justify-between text-xs font-semibold text-[#171a1f] mb-1">
            <span className="flex items-center gap-1.5">
              <Film className="w-3.5 h-3.5 text-[#0b6bcb]" />
              Video Clips ({videoFiles.length})
            </span>
            {totalVideoDuration > 0 && (
              <span className="text-[#687282] font-normal font-mono text-[11px]">
                Total: {totalVideoDuration.toFixed(1)}s
              </span>
            )}
          </div>
          <div className="space-y-1 max-h-[90px] overflow-y-auto pr-1">
            {videoFiles.map((video, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between bg-white border border-[#e2e8f0] px-2 py-1 rounded text-xs"
              >
                <div className="flex items-center gap-1.5 truncate">
                  <span className="w-4 h-4 rounded-full bg-[#eef3f8] text-[#0b6bcb] font-bold text-[10px] flex items-center justify-center shrink-0">
                    {idx + 1}
                  </span>
                  <span className="truncate font-medium text-[#1e293b]">{video.name}</span>
                  {video.duration ? (
                    <span className="text-[#64748b] text-[10px]">({video.duration.toFixed(1)}s)</span>
                  ) : null}
                </div>
                {videoFiles.length > 1 && (
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => onRemoveVideo(idx)}
                    className="text-gray-400 hover:text-red-500 p-0.5 rounded transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Multi-Audio Tracks List */}
        <div className="mb-3">
          <div className="flex items-center justify-between text-xs font-semibold text-[#171a1f] mb-1">
            <span className="flex items-center gap-1.5">
              <Music className="w-3.5 h-3.5 text-purple-600" />
              Audio Tracks / Musik ({audioFiles.length})
            </span>
            {totalAudioDuration > 0 && (
              <span className="text-[#687282] font-normal font-mono text-[11px]">
                Total: {totalAudioDuration.toFixed(1)}s
              </span>
            )}
          </div>
          <div className="space-y-1 max-h-[90px] overflow-y-auto pr-1">
            {audioFiles.map((audio, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between bg-white border border-[#e2e8f0] px-2 py-1 rounded text-xs"
              >
                <div className="flex items-center gap-1.5 truncate">
                  <span className="w-4 h-4 rounded-full bg-purple-50 text-purple-600 font-bold text-[10px] flex items-center justify-center shrink-0">
                    {idx + 1}
                  </span>
                  <span className="truncate font-medium text-[#1e293b]">{audio.name}</span>
                  {audio.duration ? (
                    <span className="text-[#64748b] text-[10px]">({audio.duration.toFixed(1)}s)</span>
                  ) : null}
                </div>
                {audioFiles.length > 1 && (
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => onRemoveAudio(idx)}
                    className="text-gray-400 hover:text-red-500 p-0.5 rounded transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Sound FX / Suara Alam List */}
        <div className="mb-3">
          <div className="flex items-center justify-between text-xs font-semibold text-[#171a1f] mb-1">
            <span className="flex items-center gap-1.5">
              <Trees className="w-3.5 h-3.5 text-emerald-600" />
              Sound FX / Suara Alam ({soundFxFiles.length})
            </span>
            {totalSfxDuration > 0 && (
              <span className="text-[#687282] font-normal font-mono text-[11px]">
                Total: {totalSfxDuration.toFixed(1)}s
              </span>
            )}
          </div>
          <div className="space-y-1 max-h-[80px] overflow-y-auto pr-1">
            {soundFxFiles.length === 0 ? (
              <div className="text-[11px] text-gray-400 italic bg-gray-50 border border-dashed border-gray-200 px-2.5 py-1.5 rounded">
                Belum ada suara alam. Klik &quot;Upload Sound FX&quot; untuk menambahkan suara sungai, hujan, dll.
              </div>
            ) : (
              soundFxFiles.map((sfx, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between bg-white border border-[#e2e8f0] px-2 py-1 rounded text-xs"
                >
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="w-4 h-4 rounded-full bg-emerald-50 text-emerald-600 font-bold text-[10px] flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <span className="truncate font-medium text-[#1e293b]">{sfx.name}</span>
                    {sfx.duration ? (
                      <span className="text-[#64748b] text-[10px]">({sfx.duration.toFixed(1)}s)</span>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => onRemoveSoundFx(idx)}
                    className="text-gray-400 hover:text-red-500 p-0.5 rounded transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Audio Volume Mixer Sliders */}
        {soundFxFiles.length > 0 && (
          <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-md p-3 mb-4 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#1e293b]">
              <Sliders className="w-3.5 h-3.5 text-[#0b6bcb]" />
              Audio Mixer (Keseimbangan Suara)
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-[#475569]">Audio Utama:</span>
                  <span className="font-mono font-semibold">{Math.round(mainAudioVolume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1.5"
                  step="0.05"
                  value={mainAudioVolume}
                  onChange={(e) => onMainAudioVolumeChange(parseFloat(e.target.value))}
                  className="w-full accent-[#0b6bcb] h-1.5 bg-gray-200 rounded-lg cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-[#475569]">Suara Alam (SFX):</span>
                  <span className="font-mono font-semibold">{Math.round(soundFxVolume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1.5"
                  step="0.05"
                  value={soundFxVolume}
                  onChange={(e) => onSoundFxVolumeChange(parseFloat(e.target.value))}
                  className="w-full accent-emerald-600 h-1.5 bg-gray-200 rounded-lg cursor-pointer"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Hidden File Inputs */}
      <input
        ref={videoInputRef}
        type="file"
        multiple
        accept="video/mp4,video/quicktime,video/x-matroska,video/avi"
        className="hidden"
        onChange={handleVideoChange}
      />
      <input
        ref={audioInputRef}
        type="file"
        multiple
        accept="audio/mp3,audio/wav,audio/m4a,audio/aac"
        className="hidden"
        onChange={handleAudioChange}
      />
      <input
        ref={sfxInputRef}
        type="file"
        multiple
        accept="audio/mp3,audio/wav,audio/m4a,audio/aac"
        className="hidden"
        onChange={handleSfxChange}
      />
      <input
        ref={overlayInputRef}
        type="file"
        accept="image/png"
        className="hidden"
        onChange={handleOverlayChange}
      />

      {/* Upload Buttons Grid */}
      <div className="pt-2">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <button
            type="button"
            disabled={disabled}
            onClick={() => videoInputRef.current?.click()}
            className="flex items-center justify-center gap-1.5 bg-white hover:bg-[#eef3f8] text-[#171a1f] font-semibold text-xs border border-[#c8ced8] py-2 px-2 rounded-md transition-colors disabled:opacity-50"
          >
            <Film className="w-4 h-4 text-[#0b6bcb]" />
            + Video
          </button>

          <button
            type="button"
            disabled={disabled}
            onClick={() => audioInputRef.current?.click()}
            className="flex items-center justify-center gap-1.5 bg-white hover:bg-[#fbf4ff] text-[#171a1f] font-semibold text-xs border border-[#c8ced8] py-2 px-2 rounded-md transition-colors disabled:opacity-50"
            title="Upload satu atau banyak file audio musik"
          >
            <Music className="w-4 h-4 text-purple-600" />
            + Audio
          </button>

          <button
            type="button"
            disabled={disabled}
            onClick={() => sfxInputRef.current?.click()}
            className="flex items-center justify-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 font-semibold text-xs border border-emerald-300 py-2 px-2 rounded-md transition-colors disabled:opacity-50 shadow-2xs"
            title="Upload suara alam (sungai, hujan, ombak, burung)"
          >
            <Trees className="w-4 h-4 text-emerald-600" />
            + Sound FX
          </button>

          <button
            type="button"
            disabled={disabled}
            onClick={() => overlayInputRef.current?.click()}
            className="flex items-center justify-center gap-1.5 bg-white hover:bg-[#eef3f8] text-[#171a1f] font-semibold text-xs border border-[#c8ced8] py-2 px-2 rounded-md transition-colors disabled:opacity-50"
          >
            <ImageIcon className="w-4 h-4 text-[#0b6bcb]" />
            Overlay PNG
          </button>
        </div>
      </div>
    </div>
  );
};
