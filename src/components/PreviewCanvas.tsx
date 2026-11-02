import React, { useRef, useEffect, useState } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Eye,
  Layers,
  Volume2,
  VolumeX,
  Music,
  Trees,
} from 'lucide-react';
import { TextFields, MediaFileItem } from '../types';

interface Props {
  texts: TextFields;
  videoFiles: MediaFileItem[];
  audioFiles: MediaFileItem[];
  soundFxFiles: MediaFileItem[];
  overlayFile: MediaFileItem | null;
  mainAudioVolume: number;
  soundFxVolume: number;
}

export const PreviewCanvas: React.FC<Props> = ({
  texts,
  videoFiles,
  audioFiles,
  soundFxFiles,
  overlayFile,
  mainAudioVolume,
  soundFxVolume,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hiddenVideoRef = useRef<HTMLVideoElement>(null);
  const hiddenAudioRef = useRef<HTMLAudioElement>(null);
  const hiddenSfxRef = useRef<HTMLAudioElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [showOverlay, setShowOverlay] = useState(true);
  const [showText, setShowText] = useState(true);
  const [showGuidelines, setShowGuidelines] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);

  const overlayImgRef = useRef<HTMLImageElement | null>(null);

  // Load overlay image
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    if (overlayFile?.localUrl) {
      img.src = overlayFile.localUrl;
    } else if (overlayFile?.path) {
      if (overlayFile.path.startsWith('uploads/')) {
        img.src = `/${overlayFile.path}`;
      } else {
        img.src = '/media/sample/overlay';
      }
    } else {
      img.src = '/media/sample/overlay';
    }
    img.onload = () => {
      overlayImgRef.current = img;
      renderFrame();
    };
    img.onerror = () => {
      overlayImgRef.current = null;
      renderFrame();
    };
  }, [overlayFile]);

  // Determine current video URL
  const currentVideo = videoFiles.length > 0 ? videoFiles[0] : null;
  const currentVideoPath = currentVideo
    ? currentVideo.localUrl ||
      (currentVideo.path.startsWith('uploads/')
        ? `/${currentVideo.path}`
        : `/media/${currentVideo.path}`)
    : null;

  // Determine current main audio URL
  const currentAudio = audioFiles.length > 0 ? audioFiles[0] : null;
  const currentAudioPath = currentAudio
    ? currentAudio.localUrl ||
      (currentAudio.path.startsWith('uploads/')
        ? `/${currentAudio.path}`
        : `/media/${currentAudio.path}`)
    : null;

  // Determine current sound FX URL
  const currentSfx = soundFxFiles.length > 0 ? soundFxFiles[0] : null;
  const currentSfxPath = currentSfx
    ? currentSfx.localUrl ||
      (currentSfx.path.startsWith('uploads/')
        ? `/${currentSfx.path}`
        : `/media/${currentSfx.path}`)
    : null;

  // Sync volume settings
  useEffect(() => {
    if (hiddenAudioRef.current) {
      hiddenAudioRef.current.volume = isMuted ? 0 : Math.max(0, Math.min(1, mainAudioVolume));
    }
  }, [mainAudioVolume, isMuted]);

  useEffect(() => {
    if (hiddenSfxRef.current) {
      hiddenSfxRef.current.volume = isMuted ? 0 : Math.max(0, Math.min(1, soundFxVolume));
    }
  }, [soundFxVolume, isMuted]);

  const renderFrame = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = 1280;
    const height = 720;

    // Background base
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, width, height);

    // Draw video frame if ready
    const video = hiddenVideoRef.current;
    if (video && video.readyState >= 2) {
      const vWidth = video.videoWidth || 1280;
      const vHeight = video.videoHeight || 720;
      const scale = Math.max(width / vWidth, height / vHeight);
      const scaledW = vWidth * scale;
      const scaledH = vHeight * scale;
      const offsetX = (width - scaledW) / 2;
      const offsetY = (height - scaledH) / 2;

      ctx.drawImage(video, offsetX, offsetY, scaledW, scaledH);
    } else {
      // Placeholder animated gradient
      const grad = ctx.createLinearGradient(0, 0, width, height);
      grad.addColorStop(0, '#1e293b');
      grad.addColorStop(0.5, '#0f172a');
      grad.addColorStop(1, '#111827');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      // Grid lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.lineWidth = 1;
      for (let y = 0; y < height; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
    }

    // Draw PNG Overlay
    if (showOverlay && overlayImgRef.current) {
      ctx.drawImage(overlayImgRef.current, 0, 0, width, height);
    }

    // Draw Guidelines if enabled
    if (showGuidelines) {
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.6)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);

      ctx.beginPath();
      ctx.moveTo(width / 2, 0);
      ctx.lineTo(width / 2, height);
      ctx.stroke();

      [150, 250, 300, 400].forEach((y) => {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      });
      ctx.setLineDash([]);
    }

    // Draw Text on video (Heading, Name, Extra, Date)
    if (showText) {
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';

      // 1. Heading (y=150, size=68)
      ctx.font = '68px "Noto Sans", -apple-system, BlinkMacSystemFont, Arial, sans-serif';
      ctx.fillText(texts.heading || '#HEADING', width / 2, 150);

      // 2. Name (y=250, size=42, bold)
      ctx.font = 'bold 42px "Noto Sans", -apple-system, BlinkMacSystemFont, Arial, sans-serif';
      ctx.fillText(texts.name || 'Name', width / 2, 250);

      // 3. Extra text (y=300, size=42)
      ctx.font = '42px "Noto Sans", -apple-system, BlinkMacSystemFont, Arial, sans-serif';
      ctx.fillText(texts.extra || 'Country', width / 2, 300);

      // 4. Date (y=400, size=36)
      ctx.font = '36px "Noto Sans", -apple-system, BlinkMacSystemFont, Arial, sans-serif';
      ctx.fillText(texts.date || 'Event date', width / 2, 400);
    }
  };

  useEffect(() => {
    renderFrame();
  }, [texts, showOverlay, showText, showGuidelines]);

  // Playback animation frame loop
  useEffect(() => {
    let animId: number;
    const loop = () => {
      if (hiddenVideoRef.current) {
        setCurrentTime(hiddenVideoRef.current.currentTime);
        if (hiddenVideoRef.current.duration) {
          setDuration(hiddenVideoRef.current.duration);
        }
      }
      renderFrame();
      if (isPlaying) {
        animId = requestAnimationFrame(loop);
      }
    };

    if (isPlaying) {
      animId = requestAnimationFrame(loop);
    } else {
      renderFrame();
    }

    return () => cancelAnimationFrame(animId);
  }, [isPlaying]);

  const togglePlay = () => {
    const video = hiddenVideoRef.current;
    const audio = hiddenAudioRef.current;
    const sfx = hiddenSfxRef.current;

    if (!isPlaying) {
      if (video) video.play().catch(() => {});
      if (audio) audio.play().catch(() => {});
      if (sfx) sfx.play().catch(() => {});
      setIsPlaying(true);
    } else {
      if (video) video.pause();
      if (audio) audio.pause();
      if (sfx) sfx.pause();
      setIsPlaying(false);
    }
  };

  const handleResetPlayback = () => {
    const video = hiddenVideoRef.current;
    const audio = hiddenAudioRef.current;
    const sfx = hiddenSfxRef.current;
    if (video) video.currentTime = 0;
    if (audio) audio.currentTime = 0;
    if (sfx) sfx.currentTime = 0;
    setCurrentTime(0);
    renderFrame();
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const target = parseFloat(e.target.value);
    const video = hiddenVideoRef.current;
    const audio = hiddenAudioRef.current;
    const sfx = hiddenSfxRef.current;

    if (video) video.currentTime = target;
    if (audio) audio.currentTime = target;
    if (sfx) sfx.currentTime = target;
    setCurrentTime(target);
    renderFrame();
  };

  const formatSeconds = (sec: number) => {
    const s = Math.floor(sec);
    const m = Math.floor(s / 60);
    const remainder = s % 60;
    return `${m.toString().padStart(2, '0')}:${remainder.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-white rounded-lg border border-[#d8dde5] p-5 shadow-xs">
      <div className="flex flex-wrap items-center justify-between pb-3 mb-3 border-b border-[#eef2f6] gap-2">
        <div className="flex items-center gap-2">
          <Eye className="w-5 h-5 text-[#0b6bcb]" />
          <div>
            <h2 className="text-base font-bold text-[#171a1f]">Live Preview (Teks + Video + Audio + Overlay)</h2>
            <p className="text-[11px] text-[#687282]">
              Sinkronisasi real-time video, overlay, audio utama, dan suara alam
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Active audio indicators */}
          {currentAudioPath && (
            <span className="flex items-center gap-1 text-[11px] font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
              <Music className="w-3 h-3" /> Audio
            </span>
          )}
          {currentSfxPath && (
            <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              <Trees className="w-3 h-3" /> Suara Alam
            </span>
          )}

          <button
            type="button"
            onClick={() => setShowOverlay((v) => !v)}
            className={`px-2 py-1 text-xs rounded border transition-colors flex items-center gap-1 font-medium ${
              showOverlay
                ? 'bg-[#eef3f8] text-[#0b6bcb] border-[#b0c8e2]'
                : 'bg-white text-[#687282] border-[#d8dde5]'
            }`}
            title="Toggle overlay layer"
          >
            <Layers className="w-3.5 h-3.5" />
            Overlay
          </button>

          <button
            type="button"
            onClick={() => setShowGuidelines((v) => !v)}
            className={`px-2 py-1 text-xs rounded border transition-colors flex items-center gap-1 font-medium ${
              showGuidelines
                ? 'bg-red-50 text-red-600 border-red-200'
                : 'bg-white text-[#687282] border-[#d8dde5]'
            }`}
            title="Toggle text guides"
          >
            Guides
          </button>
        </div>
      </div>

      {/* Hidden Media Elements for Synced Audio & Video Playback */}
      {currentVideoPath && (
        <video
          ref={hiddenVideoRef}
          src={currentVideoPath}
          loop
          muted
          playsInline
          className="hidden"
          onLoadedData={() => {
            if (hiddenVideoRef.current) setDuration(hiddenVideoRef.current.duration || 0);
            renderFrame();
          }}
        />
      )}
      {currentAudioPath && (
        <audio
          ref={hiddenAudioRef}
          src={currentAudioPath}
          loop
          className="hidden"
        />
      )}
      {currentSfxPath && (
        <audio
          ref={hiddenSfxRef}
          src={currentSfxPath}
          loop
          className="hidden"
        />
      )}

      {/* 16:9 Canvas Preview Screen */}
      <div className="relative w-full aspect-video rounded-md overflow-hidden bg-black shadow-inner border border-[#c8ced8]">
        <canvas
          ref={canvasRef}
          width={1280}
          height={720}
          className="w-full h-full object-contain block cursor-pointer"
          onClick={togglePlay}
        />

        {/* Floating playback control bar */}
        <div className="absolute bottom-2 left-2 right-2 flex flex-col gap-1.5 px-3 py-2 bg-black/75 backdrop-blur-md rounded-md text-white text-xs">
          {/* Progress Seek Bar */}
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] text-white/80 min-w-[36px]">
              {formatSeconds(currentTime)}
            </span>
            <input
              type="range"
              min={0}
              max={duration || 10}
              step={0.1}
              value={currentTime}
              onChange={handleSeek}
              className="flex-1 h-1 accent-[#0b6bcb] bg-white/20 rounded-lg cursor-pointer"
            />
            <span className="font-mono text-[10px] text-white/60 min-w-[36px] text-right">
              {formatSeconds(duration || 10)}
            </span>
          </div>

          {/* Buttons row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={togglePlay}
                className="p-1 rounded-full bg-[#0b6bcb] hover:bg-[#084f97] transition-colors text-white"
                title={isPlaying ? 'Pause' : 'Play (Video + Audio + Suara Alam)'}
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-white" />}
              </button>
              <button
                type="button"
                onClick={handleResetPlayback}
                className="p-1 rounded-full hover:bg-white/20 transition-colors text-white/80 hover:text-white"
                title="Restart ke awal"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={() => setIsMuted((m) => !m)}
                className="p-1 rounded-full hover:bg-white/20 transition-colors text-white/80 hover:text-white"
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted ? <VolumeX className="w-3.5 h-3.5 text-red-400" /> : <Volume2 className="w-3.5 h-3.5" />}
              </button>
            </div>

            <div className="text-[10px] text-white/70 font-mono flex items-center gap-2">
              <span>1280x720 @ 24fps</span>
              <span>•</span>
              <span>H.264 / AAC</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
