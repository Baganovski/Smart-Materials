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
    return sum + (typeof item.cost === 'number' ? item.cost : 0);
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
      className="bg-slate-800 rounded-xl p-6 cursor-pointer shadow-lg hover:shadow-blue-500/20 border border-transparent hover:border-blue-500 transition-all duration-300 transform hover:-translate-y-1 group"
    >
      <h3 className="text-xl font-bold text-slate-100 truncate mb-2 group-hover:text-sky-400 transition-colors">{list.name}</h3>
      <p className="text-slate-400 text-sm mb-4">
        {itemCount} {itemCount === 1 ? 'material' : 'materials'}
      </p>
      <div className="flex justify-between items-baseline">
        <span className="text-slate-500 text-xs">Est. Cost</span>
        <span className="text-2xl font-bold text-sky-400">{country.symbol}{totalCost.toFixed(2)}</span>
      </div>
    </div>
  );
};

export default ListItemTile;
