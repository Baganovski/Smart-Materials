
import React, { useState } from 'react';
import { ShoppingList, UserSettings } from '../types';

interface ListItemTileProps {
  list: ShoppingList;
  userSettings: UserSettings | null;
  isDragging: boolean;
  onClick: () => void;
  onDragStart: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragEnd: () => void;
}

const ListItemTile: React.FC<ListItemTileProps> = ({ 
  list, 
  userSettings,
  isDragging,
  onClick, 
  onDragStart, 
  onDragOver, 
  onDragEnd,
}) => {
  const itemCount = list.items?.length || 0;
  const styleName = userSettings?.statusGroups?.find(g => g.id === list.statusGroupId)?.name;
  
  // Generate a random rotation once per component instance for a stable layout.
  const [rotationClass] = useState(() => {
    const degrees = (Math.random() * 4 - 2).toFixed(2); // Random float between -2.00 and 2.00
    return `rotate-[${degrees}deg]`;
  });
  
  // Use the list's custom color, fallback to the sticky-note default (yellow) if missing
  const backgroundColor = list.color || '#fde69e';

  const tileClasses = `relative cursor-grab transition-all duration-300 group transform md:hover:scale-105 shadow-sketchy`;
  // When dragging, turn the tile into a dashed placeholder and reset transforms.
  const draggingClasses = `!bg-paper border-2 border-dashed !rotate-0 !scale-100 !shadow-none`;
  
  // Fade out the content when dragging
  const contentClasses = `transition-opacity duration-200 ${isDragging ? 'opacity-0' : 'opacity-100'}`;


  return (
    <div
      onClick={onClick}
      draggable={true}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      className={`${tileClasses} ${rotationClass} ${isDragging ? draggingClasses : ''}`}
      style={!isDragging ? { backgroundColor } : undefined}
    >
      <div className={`p-5 flex flex-col justify-between h-full ${contentClasses}`}>
        <div>
            <h3 className="text-2xl font-bold text-pencil truncate mb-1 leading-tight">{list.name}</h3>
            <p className="text-pencil-light text-sm">
              {itemCount} {itemCount === 1 ? 'item' : 'items'}
            </p>
        </div>
        {styleName && (
           <div className="mt-4">
               <span className="text-[10px] font-bold text-pencil/40 uppercase tracking-wider bg-black/5 px-2 py-1 rounded-md inline-block">
                  {styleName}
               </span>
           </div>
        )}
      </div>
    </div>
  );
};

export default ListItemTile;
