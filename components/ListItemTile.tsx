
import React from 'react';
import { ShoppingList, Country } from '../types';

interface ListItemTileProps {
  list: ShoppingList;
  country: Country;
  onClick: () => void;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
}

const ListItemTile: React.FC<ListItemTileProps> = ({ list, country, onClick, onDragStart, onDragEnd }) => {
  const totalCost = list.items.reduce((sum, item) => {
    if (typeof item.cost === 'number') {
      return sum + item.cost;
    }
    return sum;
  }, 0);

  const itemCount = list.items.length;

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
      <div className="flex justify-between items-baseline">
        <span className="text-pencil-light text-sm">Est. Cost</span>
        <span className="text-2xl font-bold text-ink whitespace-nowrap">
          {`${country.symbol}${totalCost.toFixed(2)}`}
        </span>
      </div>
    </div>
  );
};

export default ListItemTile;
