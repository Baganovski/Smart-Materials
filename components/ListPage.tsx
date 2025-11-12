import React, { useState } from 'react';
import { ShoppingList } from '../types';
import ListItemTile from './ListItemTile';
import Bin from './Bin';
import PlusIcon from './icons/PlusIcon';
import UserIcon from './icons/UserIcon';

// Fix: Define the firebase namespace and nested Timestamp type for TypeScript.
// This allows using firebase.firestore.Timestamp as a type.
declare namespace firebase {
  namespace firestore {
    interface Timestamp {
      toDate(): Date;
    }
  }
}

// This tells TypeScript that a 'firebase' object exists in the global scope
declare const firebase: any;

interface ListPageProps {
  lists: ShoppingList[];
  user: any;
  onAddList: (name: string) => void;
  onDeleteList: (id: string) => void;
  onSelectList: (id: string) => void;
  onSignOut: () => void;
}

const ListPage: React.FC<ListPageProps> = ({ lists, user, onAddList, onDeleteList, onSelectList, onSignOut }) => {
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

  const sortedLists = [...lists].sort((a, b) => {
    const getTime = (dateValue: firebase.firestore.Timestamp | string | undefined) => {
        if (!dateValue) return 0;
        // Handle Firestore Timestamp
        if (typeof dateValue === 'object' && dateValue.toDate) {
            return dateValue.toDate().getTime();
        }
        // Handle ISO string
        if (typeof dateValue === 'string') {
            return new Date(dateValue).getTime();
        }
        return 0;
    };

    return getTime(b.createdAt) - getTime(a.createdAt);
  });

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-4xl mx-auto">
      <header className="flex justify-between items-center mb-8 gap-4">
        <h1 className="text-5xl sm:text-6xl font-bold text-pencil">Smart Materials</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsAdding(true)}
            className="bg-ink hover:bg-ink-light text-white rounded-full p-3 transition-transform transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-ink focus:ring-offset-2 focus:ring-offset-paper"
            aria-label="Add new list"
          >
            <PlusIcon />
          </button>
           <div className="group relative">
             <div className="w-12 h-12 rounded-full border-2 border-pencil cursor-pointer bg-highlighter flex items-center justify-center">
                <UserIcon className="w-8 h-8 text-pencil" />
             </div>
             <div className="absolute top-full right-0 mt-2 w-48 bg-paper border-2 border-pencil rounded-md shadow-sketchy opacity-0 group-hover:opacity-100 transition-opacity duration-200 invisible group-hover:visible z-10">
                <div className="p-3 border-b border-pencil/20">
                  <p className="font-bold truncate">{user.displayName || user.email}</p>
                  <p className="text-sm text-pencil-light truncate">{user.email}</p>
                </div>
                <button onClick={onSignOut} className="w-full text-left px-3 py-2 hover:bg-highlighter transition-colors">Sign Out</button>
             </div>
           </div>
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
