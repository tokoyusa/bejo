import React, { useRef, useEffect } from 'react';
import { Terminal, Copy, Check, Trash2, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { RenderState } from '../types';

interface Props {
  renderState: RenderState;
  onClearLogs?: () => void;
}

export const ConsoleLogCard: React.FC<Props> = ({ renderState, onClearLogs }) => {
  const logEndRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = React.useState(false);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [renderState.logs]);

  const handleCopy = () => {
    navigator.clipboard.writeText(renderState.logs.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-[#101418] rounded-lg border border-[#232931] overflow-hidden shadow-md flex flex-col h-full">
      {/* Console Header */}
      <div className="bg-[#181f26] px-4 py-2.5 flex items-center justify-between border-b border-[#232931]">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-[#38bdf8]" />
          <span className="text-xs font-semibold text-[#e2e8f0]">Render &amp; Build Log</span>
          {renderState.status === 'rendering' && (
            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] bg-blue-500/20 text-blue-400 font-medium">
              <Loader2 className="w-3 h-3 animate-spin" />
              Rendering...
            </span>
          )}
          {renderState.status === 'completed' && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-emerald-500/20 text-emerald-400 font-medium">
              <CheckCircle2 className="w-3 h-3" />
              Success
            </span>
          )}
          {renderState.status === 'error' && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-red-500/20 text-red-400 font-medium">
              <AlertCircle className="w-3 h-3" />
              Failed
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopy}
            className="text-gray-400 hover:text-white p-1 rounded transition-colors text-xs flex items-center gap-1"
            title="Copy logs"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span className="text-[11px]">{copied ? 'Copied' : 'Copy'}</span>
          </button>
          {onClearLogs && (
            <button
              type="button"
              onClick={onClearLogs}
              className="text-gray-400 hover:text-white p-1 rounded transition-colors"
              title="Clear log"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Progress Bar when rendering */}
      {renderState.status === 'rendering' && (
        <div className="bg-[#141b22] px-4 py-2 border-b border-[#232931]">
          <div className="flex items-center justify-between text-[11px] text-[#94a3b8] mb-1.5 font-mono">
            <span>{renderState.step}</span>
            <span>{renderState.progress}%</span>
          </div>
          <div className="w-full bg-[#1e293b] rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-[#0b6bcb] h-full transition-all duration-300 rounded-full"
              style={{ width: `${renderState.progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Console output body matching Qt log field */}
      <div className="p-4 font-mono text-xs text-[#dbe5ef] overflow-y-auto max-h-[220px] min-h-[140px] space-y-1 select-text">
        {renderState.logs.length === 0 ? (
          <div className="text-gray-500 italic select-none">
            Ready to render. Output logs from ffmpeg, video concatenation, and audio muxing will appear here.
          </div>
        ) : (
          renderState.logs.map((log, index) => {
            const isError = log.includes('ERROR') || log.includes('failed');
            const isSuccess = log.includes('Done') || log.includes('successfully');
            const isCmd = log.startsWith('$');

            let textColor = 'text-[#dbe5ef]';
            if (isError) textColor = 'text-red-400 font-semibold';
            else if (isSuccess) textColor = 'text-emerald-400 font-semibold';
            else if (isCmd) textColor = 'text-blue-400';

            return (
              <div key={index} className={`break-all leading-relaxed ${textColor}`}>
                {log}
              </div>
            );
          })
        )}
        <div ref={logEndRef} />
      </div>
    </div>
  );
};
