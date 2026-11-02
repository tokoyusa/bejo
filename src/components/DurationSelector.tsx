import React from 'react';
import { Clock, Zap, Info, Film, Music } from 'lucide-react';
import { DurationPreset } from '../types';

interface Props {
  preset: DurationPreset;
  customMinutes: number;
  videoDuration: number;
  audioDuration: number;
  onPresetChange: (preset: DurationPreset) => void;
  onCustomMinutesChange: (mins: number) => void;
  disabled?: boolean;
}

const PRESETS: { id: DurationPreset; label: string; seconds: number; badge?: string }[] = [
  { id: 'auto', label: 'Auto (Audio)', seconds: 0, badge: 'Default' },
  { id: '15m', label: '15 Menit', seconds: 900 },
  { id: '30m', label: '30 Menit', seconds: 1800 },
  { id: '1h', label: '1 Jam', seconds: 3600, badge: 'Populer' },
  { id: '2h', label: '2 Jam', seconds: 7200 },
  { id: '3h', label: '3 Jam', seconds: 10800 },
  { id: '5h', label: '5 Jam', seconds: 18000, badge: 'Maks' },
  { id: 'custom', label: 'Kustom', seconds: 0 },
];

export const DurationSelector: React.FC<Props> = ({
  preset,
  customMinutes,
  videoDuration,
  audioDuration,
  onPresetChange,
  onCustomMinutesChange,
  disabled,
}) => {
  // Calculate target seconds
  let targetSeconds = 0;
  if (preset === 'custom') {
    targetSeconds = Math.max(60, customMinutes * 60);
  } else {
    const found = PRESETS.find((p) => p.id === preset);
    if (found && found.seconds > 0) {
      targetSeconds = found.seconds;
    } else {
      targetSeconds = audioDuration > 0 ? audioDuration : videoDuration;
    }
  }

  const effectiveDuration = targetSeconds > 0 ? targetSeconds : audioDuration;

  const videoRepeats =
    videoDuration > 0 && effectiveDuration > 0
      ? Math.max(1, Math.ceil(effectiveDuration / videoDuration))
      : 1;

  const audioRepeats =
    audioDuration > 0 && effectiveDuration > 0
      ? Math.max(1, Math.ceil(effectiveDuration / audioDuration))
      : 1;

  const formatTime = (seconds: number) => {
    const s = Math.round(seconds);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0) {
      return `${h} jam ${m > 0 ? `${m} menit` : ''}`;
    }
    return `${m} menit ${sec > 0 ? `${sec} detik` : ''}`;
  };

  return (
    <div className="bg-white rounded-lg border border-[#d8dde5] p-5 shadow-xs">
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#eef2f6]">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-[#0b6bcb]" />
          <div>
            <h2 className="text-base font-bold text-[#171a1f]">Durasi Target Video</h2>
            <p className="text-xs text-[#687282]">
              Pilih durasi akhir video (15 menit hingga 5 jam) untuk video relaksasi &amp; musik
            </p>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded text-xs font-semibold border border-emerald-200">
          <Zap className="w-3.5 h-3.5" />
          Fast Stream Copy
        </div>
      </div>

      {/* Preset Buttons Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
        {PRESETS.map((p) => {
          const isSelected = preset === p.id;
          return (
            <button
              key={p.id}
              type="button"
              disabled={disabled}
              onClick={() => onPresetChange(p.id)}
              className={`relative px-3 py-2.5 rounded-lg text-xs font-semibold transition-all border text-center flex flex-col items-center justify-center gap-1 ${
                isSelected
                  ? 'bg-[#0b6bcb] text-white border-[#0b6bcb] shadow-xs'
                  : 'bg-white hover:bg-[#f6f8fb] text-[#1e293b] border-[#d8dde5]'
              }`}
            >
              {p.badge && (
                <span
                  className={`absolute -top-2 right-2 text-[9px] px-1.5 py-0.2 rounded-full font-bold ${
                    isSelected
                      ? 'bg-amber-300 text-amber-950'
                      : 'bg-[#eef3f8] text-[#0b6bcb]'
                  }`}
                >
                  {p.badge}
                </span>
              )}
              <span className="text-xs font-bold">{p.label}</span>
              {p.seconds > 0 && (
                <span className={`text-[10px] ${isSelected ? 'text-blue-100' : 'text-[#64748b]'}`}>
                  {p.seconds >= 3600 ? `${p.seconds / 3600}h` : `${p.seconds / 60}m`}
                </span>
              )}
              {p.id === 'auto' && (
                <span className={`text-[10px] ${isSelected ? 'text-blue-100' : 'text-[#64748b]'}`}>
                  {audioDuration > 0 ? `${(audioDuration / 60).toFixed(1)}m` : '0m'}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Custom Duration Input */}
      {preset === 'custom' && (
        <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-md p-3 mb-4 flex items-center gap-3">
          <label className="text-xs font-semibold text-[#1e293b] whitespace-nowrap">
            Masukkan Durasi Kustom:
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              disabled={disabled}
              min={1}
              max={300}
              value={customMinutes}
              onChange={(e) => onCustomMinutesChange(Math.max(1, Math.min(300, parseInt(e.target.value) || 1)))}
              className="w-24 px-3 py-1.5 text-sm bg-white border border-[#c8ced8] rounded-md focus:outline-none focus:ring-2 focus:ring-[#0b6bcb]"
            />
            <span className="text-xs text-[#687282]">menit ({formatTime(customMinutes * 60)})</span>
          </div>
        </div>
      )}

      {/* Calculated Loop & Sync Information */}
      <div className="bg-[#f0f4f9] border border-[#d0dbe8] rounded-lg p-3 text-xs text-[#1e293b] space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2 font-medium">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[#0b6bcb]">Hasil Akhir:</span>
            <span className="font-mono font-bold bg-white px-2 py-0.5 rounded border border-[#c8ced8]">
              {formatTime(effectiveDuration)}
            </span>
          </div>
          <div className="flex items-center gap-4 text-[#475569] font-mono text-[11px]">
            <span className="flex items-center gap-1">
              <Film className="w-3.5 h-3.5 text-[#0b6bcb]" /> Video di-loop: <strong>{videoRepeats}x</strong>
            </span>
            <span className="flex items-center gap-1">
              <Music className="w-3.5 h-3.5 text-[#0b6bcb]" /> Audio di-loop: <strong>{audioRepeats}x</strong>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-[11px] text-[#64748b]">
          <Info className="w-3.5 h-3.5 text-[#0b6bcb] shrink-0" />
          <span>
            Menggunakan <code>-stream_loop</code> &amp; <code>-c:v copy</code> sehingga video berdurasi hingga 5 jam selesai di-render dalam hitungan detik/menit tanpa kehilangan kualitas!
          </span>
        </div>
      </div>
    </div>
  );
};
