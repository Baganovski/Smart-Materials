
import React from 'react';
import { ALL_ICONS } from '../utils/defaults';
import IconRenderer from './icons/IconRenderer';

interface IconPickerProps {
  onSelect: (iconName: string) => void;
  onClose: () => void;
}

const IconPicker: React.FC<IconPickerProps> = ({ onSelect, onClose }) => {
  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-30 z-10 flex items-center justify-center p-4"
      onClick={onClose}
    >
        <div
            className="bg-paper p-4 rounded-2xl border-2 border-pencil shadow-sketchy w-full max-w-xs animate-pop-in"
            onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside the picker
        >
            <h3 className="text-xl font-bold mb-4">Select an Icon</h3>
            <div className="grid grid-cols-5 gap-2">
                {ALL_ICONS.map(iconName => (
                    <button
                        key={iconName}
                        onClick={() => onSelect(iconName)}
                        className="flex items-center justify-center p-3 bg-highlighter/50 rounded-full md:hover:bg-ink/80 transition-colors"
                        aria-label={`Select ${iconName} icon`}
                    >
                        <IconRenderer iconName={iconName} className="w-7 h-7" />
                    </button>
                ))}
            </div>
      </div>
    </div>
  );
};

export default IconPicker;
