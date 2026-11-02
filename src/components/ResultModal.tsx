import React from 'react';
import { X, Download, Film, CheckCircle2, Play } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  outputVideoUrl: string;
}

export const ResultModal: React.FC<Props> = ({ isOpen, onClose, outputVideoUrl }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full border border-gray-200 overflow-hidden">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <div>
              <h3 className="font-bold text-gray-900 text-sm">youtube_ready.mp4</h3>
              <p className="text-xs text-gray-500">Render completed with audio sync &amp; overlay</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Video Player */}
        <div className="p-5">
          <div className="relative aspect-video rounded-lg overflow-hidden bg-black shadow-inner border border-gray-800">
            <video
              src={outputVideoUrl}
              controls
              autoPlay
              className="w-full h-full object-contain"
            />
          </div>

          <div className="mt-4 flex items-center justify-between">
            <div className="text-xs text-gray-500 space-y-0.5">
              <p className="font-medium text-gray-700">1280x720 • 24 FPS • H.264 / AAC</p>
              <p>Looped video synchronized with full audio duration</p>
            </div>

            <div className="flex items-center gap-2">
              <a
                href={outputVideoUrl}
                download="youtube_ready.mp4"
                className="flex items-center gap-2 bg-[#0b6bcb] hover:bg-[#084f97] text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors shadow-xs"
              >
                <Download className="w-4 h-4" />
                Download MP4
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
