import React from 'react';
import { Type, AlertCircle } from 'lucide-react';
import { TextFields } from '../types';

interface Props {
  texts: TextFields;
  onChange: (texts: TextFields) => void;
  disabled?: boolean;
}

export const TextInputsCard: React.FC<Props> = ({ texts, onChange, disabled }) => {
  const handleChange = (field: keyof TextFields, value: string) => {
    // 20 char limit enforcement
    if (value.length <= 20) {
      onChange({ ...texts, [field]: value });
    }
  };

  const fields: { key: keyof TextFields; label: string; placeholder: string; info: string }[] = [
    {
      key: 'heading',
      label: 'Heading',
      placeholder: '#HEADING',
      info: 'Font size 68px, y: 150 (centered)',
    },
    {
      key: 'name',
      label: 'Name',
      placeholder: 'Name',
      info: 'Font size 42px bold, y: 250 (centered)',
    },
    {
      key: 'extra',
      label: 'Extra text',
      placeholder: 'Country / City',
      info: 'Font size 42px, y: 300 (centered)',
    },
    {
      key: 'date',
      label: 'Date',
      placeholder: 'Event date',
      info: 'Font size 36px, y: 400 (centered)',
    },
  ];

  return (
    <div className="bg-white rounded-lg border border-[#d8dde5] p-5 shadow-xs">
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#eef2f6]">
        <div className="flex items-center gap-2">
          <Type className="w-5 h-5 text-[#0b6bcb]" />
          <h2 className="text-base font-bold text-[#171a1f]">Text on video</h2>
        </div>
        <span className="text-xs text-[#687282] font-mono">Max 20 chars/field</span>
      </div>

      <div className="space-y-4">
        {fields.map(({ key, label, placeholder, info }) => {
          const val = texts[key];
          const isAtLimit = val.length >= 20;

          return (
            <div key={key} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <label className="font-semibold text-[#171a1f]">{label}</label>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-[#687282] hidden sm:inline">{info}</span>
                  <span
                    className={`font-mono px-1.5 py-0.5 rounded text-[11px] font-medium ${
                      isAtLimit
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-[#f0f3f7] text-[#687282]'
                    }`}
                  >
                    {val.length}/20
                  </span>
                </div>
              </div>
              <input
                type="text"
                disabled={disabled}
                value={val}
                onChange={(e) => handleChange(key, e.target.value)}
                placeholder={placeholder}
                maxLength={20}
                className="w-full px-3 py-2 text-sm bg-white border border-[#c8ced8] rounded-md focus:outline-none focus:ring-2 focus:ring-[#0b6bcb] focus:border-[#0b6bcb] transition-colors disabled:bg-[#f6f7f9] disabled:cursor-not-allowed"
              />
            </div>
          );
        })}
      </div>

      <div className="mt-4 pt-3 border-t border-[#f0f3f7] flex items-center gap-2 text-xs text-[#687282]">
        <AlertCircle className="w-4 h-4 text-[#0b6bcb] shrink-0" />
        <span>Text is rendered using bundled Noto Sans with Cyrillic support at 24fps.</span>
      </div>
    </div>
  );
};
