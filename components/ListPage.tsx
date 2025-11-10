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
        <h1 className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-blue-600">JobCost</h1>
        <div className="flex items-center gap-3">
          <div className="relative">
            <GlobeIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
            <select
              value={country.code}
              onChange={handleCountryChange}
              className="appearance-none bg-slate-800 border border-slate-700 rounded-full py-2 pl-10 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              aria-label="Select country"
            >
              {countries.map(c => (
                <option key={c.code} value={c.code}>{c.code}</option>
              ))}
            </select>
          </div>
          <button
            onClick={() => setIsAdding(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-full p-3 shadow-lg transition-transform transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-900"
            aria-label="Add new list"
          >
            <PlusIcon />
          </button>
        </div>
      </header>

      {isAdding && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 animate-pop-in">
          <div className="bg-slate-800 p-6 rounded-lg shadow-xl w-full max-w-sm">
            <h2 className="text-xl font-bold mb-4">Create New Job List</h2>
            <input
              type="text"
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddList()}
              placeholder="e.g., Miller Residence Bathroom"
              className="w-full bg-slate-700 text-white p-3 rounded-md mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
            <div className="flex justify-end gap-3">
              <button onClick={() => setIsAdding(false)} className="px-4 py-2 bg-slate-600 hover:bg-slate-500 rounded-md transition-colors">Cancel</button>
              <button onClick={handleAddList} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md transition-colors">Create</button>
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
        <div className="text-center py-20">
          <p className="text-slate-400 text-lg">No job lists yet. Create one to get started!</p>
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
