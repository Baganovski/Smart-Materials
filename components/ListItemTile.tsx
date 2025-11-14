import React from 'react';
import { ShoppingList } from '../types';

interface ListItemTileProps {
  list: ShoppingList;
  isDragging: boolean;
  onClick: () => void;
  onDragStart: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragEnd: () => void;
  showDropIndicatorBefore: boolean;
  showDropIndicatorAfter: boolean;
}

const ListItemTile: React.FC<ListItemTileProps> = ({ 
  list, 
  isDragging, 
  onClick, 
  onDragStart, 
  onDragOver, 
  onDragEnd,
  showDropIndicatorBefore,
  showDropIndicatorAfter
}) => {
  const itemCount = list.items?.length || 0;

  const tileClasses = `relative bg-sticky-note cursor-grab transition-all duration-300 group transform md:hover:scale-105`;
  // When dragging, turn the tile into a dashed placeholder and reset transforms.
  const draggingClasses = `!bg-paper border-2 border-dashed !rotate-0 !scale-100`;
  
  // Fade out the content when dragging
  const contentClasses = `transition-opacity duration-200 ${isDragging ? 'opacity-0' : 'opacity-100'}`;


  return (
    <div
      onClick={onClick}
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      className={`${tileClasses} ${isDragging ? draggingClasses : ''}`}
    >
      {showDropIndicatorBefore && (
        <div className="absolute left-2 right-2 -top-3 h-1.5 bg-ink rounded-full animate-pop-in pointer-events-none z-10"></div>
      )}

      {/* Adhesive strip */}
      <div className={`absolute top-0 left-0 right-0 h-8 bg-black/5 border-b border-black/10 ${contentClasses}`} />
      
      <div className={`pt-10 px-6 pb-6 ${contentClasses}`}>
        <h3 className="text-2xl font-bold text-pencil truncate mb-2">{list.name}</h3>
        <p className="text-pencil-light text-base mb-4">
          {itemCount} {itemCount === 1 ? 'material' : 'materials'}
        </p>
      </div>
      
      {showDropIndicatorAfter && (
        <div className="absolute left-2 right-2 -bottom-3 h-1.5 bg-ink rounded-full animate-pop-in pointer-events-none z-10"></div>
      )}
    </div>
  );
};

export default ListItemTile;