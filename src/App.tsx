import React, { useState, useEffect } from 'react';
import { Play, FolderCheck, Film, Clock } from 'lucide-react';
import {
  TextFields,
  MediaFileItem,
  DurationPreset,
  RenderState,
  ServerStatusResponse,
} from './types';
import { TextInputsCard } from './components/TextInputsCard';
import { FilesCard } from './components/FilesCard';
import { DurationSelector } from './components/DurationSelector';
import { PreviewCanvas } from './components/PreviewCanvas';
import { ConsoleLogCard } from './components/ConsoleLogCard';
import { ResultModal } from './components/ResultModal';
import { probeLocalMedia, uploadMediaFile } from './utils/uploader';

const DEFAULT_TEXTS: TextFields = {
  heading: '#HEADING',
  name: 'Name',
  extra: 'Country',
  date: 'Event date',
};

export default function App() {
  const [texts, setTexts] = useState<TextFields>(DEFAULT_TEXTS);
  const [videoFiles, setVideoFiles] = useState<MediaFileItem[]>([
    { name: 'source4.mp4', path: 'sample/video/source4.mp4', duration: 10.37 },
  ]);
  const [audioFiles, setAudioFiles] = useState<MediaFileItem[]>([
    {
      name: 'voice.mp3',
      path: 'sample/audio/voice.mp3',
      duration: 297.43,
    },
  ]);
  const [soundFxFiles, setSoundFxFiles] = useState<MediaFileItem[]>([
    {
      name: 'nature_river.mp3 (Sungai Alami)',
      path: 'sample/audio/nature_river.mp3',
      duration: 10.37,
    },
  ]);
  const [overlayFile, setOverlayFile] = useState<MediaFileItem | null>({
    name: 'overlay.png',
    path: 'sample/overlay',
  });

  const [mainAudioVolume, setMainAudioVolume] = useState<number>(1.0);
  const [soundFxVolume, setSoundFxVolume] = useState<number>(0.5);

  const [durationPreset, setDurationPreset] = useState<DurationPreset>('auto');
  const [customMinutes, setCustomMinutes] = useState<number>(60);

  const [hasFinalOutput, setHasFinalOutput] = useState(false);

  const [renderState, setRenderState] = useState<RenderState>({
    status: 'idle',
    step: '',
    progress: 0,
    logs: [],
    outputFile: null,
    error: null,
    startedAt: null,
    completedAt: null,
  });

  const [isResultOpen, setIsResultOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Load initial status
  useEffect(() => {
    fetchStatus();

    const eventSource = new EventSource('/api/render/events');
    eventSource.onmessage = (event) => {
      try {
        const state: RenderState = JSON.parse(event.data);
        setRenderState(state);
        if (state.outputFile) {
          setHasFinalOutput(true);
        }
      } catch (e) {
        console.error('Failed to parse SSE event', e);
      }
    };

    return () => {
      eventSource.close();
    };
  }, []);

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/status');
      if (res.ok) {
        const data: ServerStatusResponse = await res.json();
        if (data.defaultVideos && data.defaultVideos.length > 0) {
          setVideoFiles(data.defaultVideos);
        }
        if (data.defaultAudio) {
          setAudioFiles([data.defaultAudio]);
        }
        if (data.defaultSoundFx) {
          setSoundFxFiles([data.defaultSoundFx]);
        }
        setHasFinalOutput(data.hasFinal);
        if (data.currentRender) {
          setRenderState(data.currentRender);
        }
      }
    } catch (err) {
      console.warn('Could not connect to /api/status yet', err);
    }
  };

  const handleResetDefaults = async () => {
    try {
      await fetch('/api/reset', { method: 'POST' });
    } catch {}
    setTexts(DEFAULT_TEXTS);
    setDurationPreset('auto');
    setCustomMinutes(60);
    setMainAudioVolume(1.0);
    setSoundFxVolume(0.5);
    fetchStatus();
  };

  // Video Uploads
  const handleAddVideos = async (files: File[]) => {
    setIsUploading(true);

    for (const file of files) {
      const localUrl = URL.createObjectURL(file);
      let duration = 0;
      try {
        const probe = await probeLocalMedia(file, 'video');
        duration = probe.duration;
      } catch {}

      const placeholder: MediaFileItem = {
        name: file.name,
        path: '',
        duration,
        size: file.size,
        localUrl,
        isUploaded: false,
        isUploading: true,
        uploadProgress: 0,
        uploadError: null,
      };

      setVideoFiles((prev) => [...prev, placeholder]);

      try {
        const result = await uploadMediaFile(file, (pct) => {
          setVideoFiles((prev) =>
            prev.map((v) =>
              v.localUrl === localUrl ? { ...v, uploadProgress: pct } : v
            )
          );
        });

        setVideoFiles((prev) =>
          prev.map((v) =>
            v.localUrl === localUrl
              ? {
                  ...v,
                  path: result.path,
                  isUploaded: true,
                  isUploading: false,
                  uploadProgress: 100,
                  uploadError: null,
                }
              : v
          )
        );
      } catch (err: any) {
        console.error('Failed to upload video:', file.name, err);
        setVideoFiles((prev) =>
          prev.map((v) =>
            v.localUrl === localUrl
              ? {
                  ...v,
                  isUploading: false,
                  uploadError: err.message || 'Upload failed',
                }
              : v
          )
        );
      }
    }

    setIsUploading(false);
  };

  const handleRemoveVideo = (index: number) => {
    setVideoFiles((prev) => {
      const target = prev[index];
      if (target?.localUrl) {
        URL.revokeObjectURL(target.localUrl);
      }
      return prev.filter((_, idx) => idx !== index);
    });
  };

  // Multiple Audio Tracks Upload
  const handleAddAudios = async (files: File[]) => {
    setIsUploading(true);

    for (const file of files) {
      const localUrl = URL.createObjectURL(file);
      let duration = 0;
      try {
        const probe = await probeLocalMedia(file, 'audio');
        duration = probe.duration;
      } catch {}

      const placeholder: MediaFileItem = {
        name: file.name,
        path: '',
        duration,
        size: file.size,
        localUrl,
        isUploaded: false,
        isUploading: true,
        uploadProgress: 0,
        uploadError: null,
      };

      setAudioFiles((prev) => [...prev, placeholder]);

      try {
        const result = await uploadMediaFile(file, (pct) => {
          setAudioFiles((prev) =>
            prev.map((a) =>
              a.localUrl === localUrl ? { ...a, uploadProgress: pct } : a
            )
          );
        });

        setAudioFiles((prev) =>
          prev.map((a) =>
            a.localUrl === localUrl
              ? {
                  ...a,
                  path: result.path,
                  isUploaded: true,
                  isUploading: false,
                  uploadProgress: 100,
                  uploadError: null,
                }
              : a
          )
        );
      } catch (err: any) {
        console.error('Failed to upload audio:', file.name, err);
        setAudioFiles((prev) =>
          prev.map((a) =>
            a.localUrl === localUrl
              ? {
                  ...a,
                  isUploading: false,
                  uploadError: err.message || 'Upload failed',
                }
              : a
          )
        );
      }
    }

    setIsUploading(false);
  };

  const handleRemoveAudio = (index: number) => {
    setAudioFiles((prev) => {
      const target = prev[index];
      if (target?.localUrl) {
        URL.revokeObjectURL(target.localUrl);
      }
      return prev.filter((_, idx) => idx !== index);
    });
  };

  // Sound FX (Suara Alam) Upload
  const handleAddSoundFx = async (files: File[]) => {
    setIsUploading(true);

    for (const file of files) {
      const localUrl = URL.createObjectURL(file);
      let duration = 0;
      try {
        const probe = await probeLocalMedia(file, 'audio');
        duration = probe.duration;
      } catch {}

      const placeholder: MediaFileItem = {
        name: file.name,
        path: '',
        duration,
        size: file.size,
        localUrl,
        isUploaded: false,
        isUploading: true,
        uploadProgress: 0,
        uploadError: null,
      };

      setSoundFxFiles((prev) => [...prev, placeholder]);

      try {
        const result = await uploadMediaFile(file, (pct) => {
          setSoundFxFiles((prev) =>
            prev.map((s) =>
              s.localUrl === localUrl ? { ...s, uploadProgress: pct } : s
            )
          );
        });

        setSoundFxFiles((prev) =>
          prev.map((s) =>
            s.localUrl === localUrl
              ? {
                  ...s,
                  path: result.path,
                  isUploaded: true,
                  isUploading: false,
                  uploadProgress: 100,
                  uploadError: null,
                }
              : s
          )
        );
      } catch (err: any) {
        console.error('Failed to upload Sound FX:', file.name, err);
        setSoundFxFiles((prev) =>
          prev.map((s) =>
            s.localUrl === localUrl
              ? {
                  ...s,
                  isUploading: false,
                  uploadError: err.message || 'Upload failed',
                }
              : s
          )
        );
      }
    }

    setIsUploading(false);
  };

  const handleRemoveSoundFx = (index: number) => {
    setSoundFxFiles((prev) => {
      const target = prev[index];
      if (target?.localUrl) {
        URL.revokeObjectURL(target.localUrl);
      }
      return prev.filter((_, idx) => idx !== index);
    });
  };

  // Overlay Upload
  const handleSetOverlay = async (file: File) => {
    setIsUploading(true);
    const localUrl = URL.createObjectURL(file);

    setOverlayFile({
      name: file.name,
      path: '',
      size: file.size,
      localUrl,
      isUploaded: false,
      isUploading: true,
      uploadProgress: 0,
      uploadError: null,
    });

    try {
      const result = await uploadMediaFile(file, (pct) => {
        setOverlayFile((prev) => (prev ? { ...prev, uploadProgress: pct } : null));
      });

      setOverlayFile((prev) =>
        prev
          ? {
              ...prev,
              path: result.path,
              isUploaded: true,
              isUploading: false,
              uploadProgress: 100,
              uploadError: null,
            }
          : null
      );
    } catch (err: any) {
      console.error('Failed to upload overlay:', err);
      setOverlayFile((prev) =>
        prev
          ? {
              ...prev,
              isUploading: false,
              uploadError: err.message || 'Upload failed',
            }
          : null
      );
    }
    setIsUploading(false);
  };

  // Calculate target duration in seconds
  const getTargetDurationSeconds = (): number => {
    switch (durationPreset) {
      case '15m':
        return 900;
      case '30m':
        return 1800;
      case '1h':
        return 3600;
      case '2h':
        return 7200;
      case '3h':
        return 10800;
      case '5h':
        return 18000;
      case 'custom':
        return Math.max(60, customMinutes * 60);
      case 'auto':
      default:
        return 0; // 0 indicates auto match audio duration
    }
  };

  const handleStartRender = async () => {
    if (renderState.status === 'rendering') return;

    const stillUploading =
      videoFiles.some((v) => v.isUploading) ||
      audioFiles.some((a) => a.isUploading) ||
      soundFxFiles.some((s) => s.isUploading) ||
      overlayFile?.isUploading;

    if (stillUploading) {
      alert('Tunggu proses upload file selesai sebelum mulai render.');
      return;
    }

    if (videoFiles.length === 0) {
      alert('Pilih minimal satu file video.');
      return;
    }
    if (audioFiles.length === 0) {
      alert('Pilih minimal satu file audio utama.');
      return;
    }
    if (!overlayFile) {
      alert('Pilih file overlay PNG.');
      return;
    }

    const missingVideos = videoFiles.some((v) => !v.path);
    const missingAudios = audioFiles.some((a) => !a.path);
    const missingSfx = soundFxFiles.some((s) => !s.path);
    if (missingVideos || missingAudios || missingSfx || !overlayFile.path) {
      alert('Sebagian file belum selesai di-upload ke server. Silakan cek kembali.');
      return;
    }

    try {
      const payload = {
        heading: texts.heading,
        name: texts.name,
        extra: texts.extra,
        date: texts.date,
        videos: videoFiles.map((v) => v.path),
        audioFiles: audioFiles.map((a) => a.path),
        soundFxFiles: soundFxFiles.map((s) => s.path),
        mainAudioVolume,
        soundFxVolume,
        targetDurationSeconds: getTargetDurationSeconds(),
        overlay: overlayFile.path,
      };

      const res = await fetch('/api/render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        alert(`Gagal memulai build: ${data.error || 'Server error'}`);
      }
    } catch (err: any) {
      alert(`Network error: ${err.message}`);
    }
  };

  const isRendering = renderState.status === 'rendering';
  const totalVideoDuration = videoFiles.reduce((acc, v) => acc + (v.duration || 0), 0);
  const totalAudioDuration = audioFiles.reduce((acc, a) => acc + (a.duration || 0), 0);

  return (
    <div className="min-h-screen bg-[#f6f7f9] text-[#171a1f] flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-[#d8dde5] px-6 py-4 shadow-2xs">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#0b6bcb] flex items-center justify-center text-white shadow-xs">
                <Film className="w-5 h-5" />
              </div>
              <h1 className="text-2xl font-black tracking-tight text-[#171a1f]">Replicator</h1>
              <span className="text-xs px-2 py-0.5 rounded bg-blue-50 text-[#0b6bcb] font-bold border border-blue-200">
                1280x720 • 15m - 5 Jam
              </span>
            </div>
            <p className="text-sm text-[#687282] mt-0.5">
              Composite video clips, PNG overlay, teks title, multi-audio &amp; suara alam (Sound FX) looped up to 5 hours
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={isRendering || isUploading}
              onClick={handleStartRender}
              className="flex items-center gap-2 bg-[#0b6bcb] hover:bg-[#084f97] disabled:bg-[#edf0f4] disabled:text-[#8b949e] disabled:cursor-not-allowed text-white font-bold text-sm px-6 py-2.5 rounded-md transition-all shadow-xs"
            >
              <Play className="w-4 h-4 fill-current" />
              {isRendering ? 'Rendering...' : 'Mulai Render'}
            </button>

            <button
              type="button"
              disabled={!hasFinalOutput}
              onClick={() => setIsResultOpen(true)}
              className="flex items-center gap-2 bg-white hover:bg-[#eef3f8] disabled:bg-[#edf0f4] disabled:text-[#8b949e] disabled:cursor-not-allowed text-[#171a1f] font-semibold text-sm px-4 py-2.5 rounded-md border border-[#c8ced8] transition-colors"
            >
              <FolderCheck className="w-4 h-4 text-[#0b6bcb]" />
              Buka Hasil
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto w-full p-6 space-y-6 flex-1">
        {/* Top Split Layout: Text Inputs & Files Card */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TextInputsCard texts={texts} onChange={setTexts} disabled={isRendering} />

          <FilesCard
            videoFiles={videoFiles}
            audioFiles={audioFiles}
            soundFxFiles={soundFxFiles}
            overlayFile={overlayFile}
            mainAudioVolume={mainAudioVolume}
            soundFxVolume={soundFxVolume}
            hasFinalOutput={hasFinalOutput}
            onAddVideos={handleAddVideos}
            onRemoveVideo={handleRemoveVideo}
            onAddAudios={handleAddAudios}
            onRemoveAudio={handleRemoveAudio}
            onAddSoundFx={handleAddSoundFx}
            onRemoveSoundFx={handleRemoveSoundFx}
            onMainAudioVolumeChange={setMainAudioVolume}
            onSoundFxVolumeChange={setSoundFxVolume}
            onSetOverlay={handleSetOverlay}
            onResetDefaults={handleResetDefaults}
            disabled={isRendering}
          />
        </div>

        {/* Feature 1: Target Video Duration Selector (15 menit hingga 5 jam) */}
        <DurationSelector
          preset={durationPreset}
          customMinutes={customMinutes}
          videoDuration={totalVideoDuration}
          audioDuration={totalAudioDuration}
          onPresetChange={setDurationPreset}
          onCustomMinutesChange={setCustomMinutes}
          disabled={isRendering}
        />

        {/* Feature 2: Live Preview Canvas (Video + Overlay + Teks + Audio + Suara Alam) & Build Log */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7">
            <PreviewCanvas
              texts={texts}
              videoFiles={videoFiles}
              audioFiles={audioFiles}
              soundFxFiles={soundFxFiles}
              overlayFile={overlayFile}
              mainAudioVolume={mainAudioVolume}
              soundFxVolume={soundFxVolume}
            />
          </div>

          <div className="lg:col-span-5">
            <ConsoleLogCard
              renderState={renderState}
              onClearLogs={() =>
                setRenderState((prev) => ({ ...prev, logs: [] }))
              }
            />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-[#d8dde5] py-3 px-6 text-xs text-[#687282] text-center">
        Replicator • Video relaksasi &amp; ambient MP4 dengan sinkronisasi looping audio &amp; suara alam hingga 5 jam
      </footer>

      {/* Result Player Modal */}
      <ResultModal
        isOpen={isResultOpen}
        onClose={() => setIsResultOpen(false)}
        outputVideoUrl="/media/output"
      />
    </div>
  );
}
