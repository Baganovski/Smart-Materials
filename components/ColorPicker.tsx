import React from 'react';
import { PRESET_COLORS } from '../utils/defaults';

interface ColorPickerProps {
  onSelect: (color: string) => void;
  onClose: () => void;
}

const ColorPicker: React.FC<ColorPickerProps> = ({ onSelect, onClose }) => {
  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-30 z-20 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-paper p-4 rounded-lg border-2 border-pencil shadow-sketchy w-full max-w-xs animate-pop-in"
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside the picker
      >
        <h3 className="text-xl font-bold mb-4">Select a Color</h3>
        <div className="grid grid-cols-6 gap-2">
          {PRESET_COLORS.map(color => (
            <button
              key={color}
              onClick={() => onSelect(color)}
              className="w-10 h-10 rounded-full border-2 border-pencil/20 transition-transform transform hover:scale-110"
              style={{ backgroundColor: color }}
              aria-label={`Select color ${color}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default ColorPicker;
