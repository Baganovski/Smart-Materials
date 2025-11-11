import React, { useState } from 'react';
import { ShoppingList, Country } from '../types';
import ListItemTile from './ListItemTile';
import Bin from './Bin';
import PlusIcon from './icons/PlusIcon';
import { countries } from '../utils/countries';
import GlobeIcon from './icons/GlobeIcon';

interface ListPageProps {
  lists: ShoppingList[];
  onAddList: (name: string) => void;
  onDeleteList: (id: string) => void;
  onSelectList: (id: string) => void;
  country: Country;
  onCountryChange: (country: Country) => void;
}

const ListPage: React.FC<ListPageProps> = ({ lists, onAddList, onDeleteList, onSelectList, country, onCountryChange }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);

  const handleAddList = () => {
    if (newListName.trim()) {
      onAddList(newListName.trim());
      setNewListName('');
      setIsAdding(false);
    }
  };

  const handleCountryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedCountry = countries.find(c => c.code === e.target.value);
    if (selectedCountry) {
      onCountryChange(selectedCountry);
    }
  };

  const sortedLists = [...lists].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-4xl mx-auto">
      <header className="flex justify-between items-center mb-8 gap-4">
        <h1 className="text-5xl sm:text-6xl font-bold text-pencil">Smart Materials</h1>
        <div className="flex items-center gap-3">
          <div className="relative">
            <GlobeIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-pencil-light pointer-events-none" />
            <select
              value={country.code}
              onChange={handleCountryChange}
              className="appearance-none bg-paper border-2 border-pencil rounded-full py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-ink transition-colors"
              aria-label="Select country"
            >
              {countries.map(c => (
                <option key={c.code} value={c.code}>{c.code}</option>
              ))}
            </select>
          </div>
          <button
            onClick={() => setIsAdding(true)}
            className="bg-ink hover:bg-ink-light text-white rounded-full p-3 transition-transform transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-ink focus:ring-offset-2 focus:ring-offset-paper"
            aria-label="Add new list"
          >
            <PlusIcon />
          </button>
        </div>
      </header>

      {isAdding && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-pop-in">
          <div className="bg-paper p-6 rounded-lg border-2 border-pencil shadow-sketchy w-full max-w-sm">
            <h2 className="text-2xl font-bold mb-4">Create New Job List</h2>
            <input
              type="text"
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddList()}
              placeholder="e.g., Miller Residence Bathroom"
              className="w-full bg-highlighter text-pencil placeholder-pencil-light p-3 rounded-md mb-4 focus:outline-none focus:ring-2 focus:ring-ink border-2 border-pencil"
              autoFocus
            />
            <div className="flex justify-end gap-3">
              <button onClick={() => setIsAdding(false)} className="px-4 py-2 bg-transparent hover:bg-highlighter border-2 border-pencil rounded-md transition-colors">Cancel</button>
              <button onClick={handleAddList} className="px-4 py-2 bg-ink hover:bg-ink-light text-white rounded-md transition-colors">Create</button>
            </div>
          </div>
        </div>
      )}

      {sortedLists.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedLists.map(list => (
            <ListItemTile 
              key={list.id} 
              list={list}
              country={country}
              onClick={() => onSelectList(list.id)}
              onDragStart={(id) => { setIsDragging(true); setDraggedItemId(id); }}
              onDragEnd={() => { setIsDragging(false); setDraggedItemId(null); }}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-20 border-2 border-dashed border-pencil/30 rounded-lg">
          <p className="text-pencil-light text-xl">No job lists yet. Create one to get started!</p>
        </div>
      )}
      
      <Bin 
        isVisible={isDragging} 
        onDrop={() => {
          if (draggedItemId) {
            onDeleteList(draggedItemId);
          }
        }}
      />
    </div>
  );
};

export default ListPage;