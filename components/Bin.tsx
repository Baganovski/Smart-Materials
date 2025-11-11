import React, { useState } from 'react';
import TrashIcon from './icons/TrashIcon';

interface BinProps {
  isVisible: boolean;
  onDrop: () => void;
}

const Bin: React.FC<BinProps> = ({ isVisible, onDrop }) => {
  const [isOver, setIsOver] = useState(false);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setIsOver(true);
  };

  const handleDragLeave = () => {
    setIsOver(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    onDrop();
    setIsOver(false);
  };

  if (!isVisible) return null;

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`fixed bottom-0 left-0 right-0 h-40 flex items-center justify-center transition-opacity duration-300 animate-slide-up ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <div className={`p-8 rounded-full border-2 border-dashed transition-all duration-300 ${isOver ? 'bg-danger/10 border-danger scale-110' : 'border-pencil-light'}`}>
        <TrashIcon className={`w-10 h-10 transition-all duration-300 ${isOver ? 'text-danger' : 'text-pencil-light'}`} />
      </div>
    </div>
  );
};

export default Bin;