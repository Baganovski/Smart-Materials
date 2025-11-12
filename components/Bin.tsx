
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

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`fixed bottom-0 left-0 right-0 flex items-center justify-center transition-all duration-300 ease-out ${
        isVisible ? 'h-40' : 'h-20'
      }`}
    >
      <div 
        className={`flex flex-col items-center justify-center transition-all duration-300 ease-out transform ${
            isVisible ? '' : 'scale-75'
        }`}
      >
        <div className={`p-6 rounded-full border-2 border-dashed transition-all duration-300 ${
            isOver 
                ? 'bg-danger/10 border-danger scale-110' 
                : isVisible 
                    ? 'border-pencil-light' 
                    : 'border-pencil/30'
        }`}>
          <TrashIcon className={`w-10 h-10 transition-all duration-300 ${
            isOver 
                ? 'text-danger' 
                : isVisible 
                    ? 'text-pencil-light' 
                    : 'text-pencil/40'
          }`} />
        </div>

        <p className={`mt-2 text-pencil-light transition-opacity duration-300 ${isVisible && !isOver ? 'opacity-100' : 'opacity-0'}`}>
            Drag here to delete
        </p>
      </div>
    </div>
  );
};

export default Bin;
