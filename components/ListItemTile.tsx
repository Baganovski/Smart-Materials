

import React from 'react';
import { ShoppingList } from '../types';

interface ListItemTileProps {
  list: ShoppingList;
  onClick: () => void;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
}

const ListItemTile: React.FC<ListItemTileProps> = ({ list, onClick, onDragStart, onDragEnd }) => {
  const itemCount = list.items?.length || 0;

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    e.dataTransfer.setData('text/plain', list.id);
    e.dataTransfer.effectAllowed = 'move';
    onDragStart(list.id);
  };

  return (
    <div
      onClick={onClick}
      draggable
      onDragStart={handleDragStart}
      onDragEnd={onDragEnd}
      className="bg-highlighter rounded-lg p-6 cursor-pointer border-2 border-pencil shadow-sketchy hover:shadow-sketchy-hover transition-all duration-200 group"
    >
      <h3 className="text-2xl font-bold text-pencil truncate mb-2 group-hover:text-ink transition-colors">{list.name}</h3>
      <p className="text-pencil-light text-base mb-4">
        {itemCount} {itemCount === 1 ? 'material' : 'materials'}
      </p>
    </div>
  );
};

export default ListItemTile;