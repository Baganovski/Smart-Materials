
import React, { useState, useRef } from 'react';
import TrashIcon from './icons/TrashIcon';

interface BinProps {
  isVisible: boolean;
  onDrop: () => void;
}

const Bin: React.FC<BinProps> = ({ isVisible, onDrop }) => {
  const [isOver, setIsOver] = useState(false);
  const dragCounter = useRef(0);

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    dragCounter.current++;
    if (!isOver) {
      setIsOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setIsOver(false);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    // onDragOver must be present and preventDefault() must be called
    // to allow a drop to occur.
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    dragCounter.current = 0;
    onDrop();
    setIsOver(false);
  };

  return (
    <div
      className={`fixed bottom-0 left-1/2 -translate-x-1/2 w-1/2 flex items-center justify-center transition-all duration-300 ease-out pointer-events-none ${
        isVisible ? 'h-40' : 'h-20'
      }`}
    >
      <div 
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={`flex flex-col items-center justify-center transition-all duration-300 ease-out transform pointer-events-auto ${
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

        <p className={`mt-2 text-lg text-center transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
            {isOver 
                ? <span className="font-bold text-danger">Release to delete</span>
                : <span className="text-pencil-light">Drag here to delete</span>
            }
        </p>
      </div>
    </div>
  );
};

export default Bin;
