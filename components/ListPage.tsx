import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ShoppingList, UserSettings } from '../types';
import ListItemTile from './ListItemTile';
import Bin from './Bin';
import ConfirmationModal from './ConfirmationModal';
import CustomizeModal from './CustomizeModal';

// Fix: Add firebase declaration to provide an object for the global types.
declare const firebase: any;

interface ListPageProps {
  lists: ShoppingList[];
  user: any;
  userSettings: UserSettings | null;
  onAddList: (name: string) => void;
  onDeleteList: (id: string) => void;
  onSelectList: (id: string) => void;
  onSignOut: () => void;
  onUpdateList: (list: ShoppingList) => void;
  onUpdateUserSettings: (settings: UserSettings) => void;
}

const ListPage: React.FC<ListPageProps> = ({ lists, user, userSettings, onAddList, onDeleteList, onSelectList, onSignOut, onUpdateList, onUpdateUserSettings }) => {
  const [isAdding, setIsAdding] = useState(false);
  // Fix: Added missing '=' in useState declaration.
  const [newListName, setNewListName] = useState('');
  const [isCustomizeModalOpen, setIsCustomizeModalOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  
  // State for drag-to-delete
  const [isDraggingForDelete, setIsDraggingForDelete] = useState(false);
  const [listToDelete, setListToDelete] = useState<ShoppingList | null>(null);

  // State for drag-to-reorder
  const [draggedList, setDraggedList] = useState<ShoppingList | null>(null);
  const [listsForRender, setListsForRender] = useState<ShoppingList[]>([]);
  
  const listsSortedByDate = useMemo(() => {
    const listsCopy = [...lists];

    const getTime = (dateValue: firebase.firestore.Timestamp | string | undefined): number => {
        if (!dateValue) return 0;
        if (typeof dateValue === 'object' && dateValue.toDate) return dateValue.toDate().getTime();
        if (typeof dateValue === 'string') return new Date(dateValue).getTime();
        return 0;
    };
    
    listsCopy.sort((a, b) => getTime(b.createdAt) - getTime(a.createdAt));
    return listsCopy;
  }, [lists]);


  useEffect(() => {
    if (!draggedList) {
      setListsForRender(listsSortedByDate);
    }
  }, [listsSortedByDate, draggedList]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [userMenuRef]);


  const handleAddList = () => {
    if (newListName.trim()) {
      onAddList(newListName.trim());
      setNewListName('');
      setIsAdding(false);
    }
  };

  const handleDragStart = (e: React.DragEvent, list: ShoppingList) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', list.id);
    setTimeout(() => {
      setDraggedList(list);
      setIsDraggingForDelete(true);
    }, 0);
  };

  const handleDragEnd = () => {
    setDraggedList(null);
    setIsDraggingForDelete(false);
  };

  const handleDragOverList = (e: React.DragEvent, hoverList: ShoppingList) => {
    e.preventDefault();
    if (!draggedList || draggedList.id === hoverList.id) return;

    const currentLists = listsForRender;
    const dragIndex = currentLists.findIndex(l => l.id === draggedList.id);
    const hoverIndex = currentLists.findIndex(l => l.id === hoverList.id);

    if (dragIndex === -1 || hoverIndex === -1 || dragIndex === hoverIndex) {
      return;
    }

    const reorderedLists = [...currentLists];
    const [movedItem] = reorderedLists.splice(dragIndex, 1);
    reorderedLists.splice(hoverIndex, 0, movedItem);

    setListsForRender(reorderedLists);
  };

  const handleDropOnList = () => {
    if (draggedList === null) return;
    
    const finalIndex = listsForRender.findIndex(list => list.id === draggedList.id);
    if (finalIndex === -1) return;

    const originalIndex = listsSortedByDate.findIndex(list => list.id === draggedList.id);
    if (finalIndex === originalIndex) {
      return;
    }
    
    const prevList = listsForRender[finalIndex - 1] || null;
    const nextList = listsForRender[finalIndex + 1] || null;

    const getTimestamp = (dateValue: any): number => {
        if (!dateValue) return new Date().getTime();
        if (typeof dateValue === 'object' && dateValue.toDate) return dateValue.toDate().getTime();
        if (typeof dateValue === 'string') return new Date(dateValue).getTime();
        return new Date().getTime();
    };

    let newTimestampMs;
    const prevTime = prevList ? getTimestamp(prevList.createdAt) : 0;
    const nextTime = nextList ? getTimestamp(nextList.createdAt) : 0;

    if (prevList && nextList) {
        newTimestampMs = (prevTime + nextTime) / 2;
    } else if (prevList) {
        newTimestampMs = prevTime - 1000; 
    } else if (nextList) {
        newTimestampMs = nextTime + 1000;
    } else {
        return; 
    }
    
    if (!newTimestampMs || isNaN(newTimestampMs)) {
      console.error("Failed to calculate a valid timestamp for reordering.");
      return;
    }

    const newCreatedAt = firebase.firestore.Timestamp.fromMillis(newTimestampMs);
    
    onUpdateList({ ...draggedList, createdAt: newCreatedAt });
  };
  
  const handleConfirmDelete = () => {
    if (listToDelete) {
      onDeleteList(listToDelete.id);
      setListToDelete(null);
    }
  };
  
  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-4xl mx-auto pb-48">
      <header className="flex justify-between items-center mb-8 gap-4">
        <h1 className="text-5xl sm:text-6xl font-bold text-pencil">List Jotter</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsAdding(true)}
            className="bg-ink md:hover:bg-ink-light text-pencil rounded-full w-12 h-12 flex items-center justify-center text-3xl font-bold transition-transform transform md:hover:scale-110 focus:outline-none focus:ring-2 focus:ring-ink focus:ring-offset-2 focus:ring-offset-paper"
            aria-label="Add new list"
          >
            +
          </button>
           <div className="relative" ref={userMenuRef}>
             <button
                onClick={() => setIsUserMenuOpen(prev => !prev)}
                className="w-12 h-12 rounded-full border-2 border-pencil cursor-pointer bg-highlighter flex items-center justify-center font-bold text-xl focus:outline-none focus:ring-2 focus:ring-ink focus:ring-offset-2 focus:ring-offset-paper"
                aria-label="Open user menu"
                aria-haspopup="true"
                aria-expanded={isUserMenuOpen}
             >
                {(user.displayName || user.email)?.[0]?.toUpperCase() ?? 'U'}
             </button>
             <div className={`absolute top-10 right-0 w-48 bg-paper border-2 border-pencil rounded-md shadow-sketchy transition-opacity duration-200 z-10 ${isUserMenuOpen ? 'opacity-100 visible' : 'opacity-0 invisible'}`}>
                <div className="p-3 border-b border-pencil/20">
                  <p className="font-bold truncate">{user.displayName || user.email}</p>
                  <p className="text-sm text-pencil-light truncate">{user.email}</p>
                </div>
                <button 
                  onClick={() => { setIsCustomizeModalOpen(true); setIsUserMenuOpen(false); }} 
                  className="w-full text-left px-3 py-2 md:hover:bg-highlighter transition-colors"
                >
                  <span>Customize</span>
                </button>
                <button onClick={onSignOut} className="w-full text-left px-3 py-2 md:hover:bg-highlighter transition-colors">Sign Out</button>
             </div>
           </div>
        </div>
      </header>

      {isAdding && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-pop-in">
          <div className="bg-paper p-6 rounded-lg border-2 border-pencil shadow-sketchy w-full max-w-sm">
            <h2 className="text-2xl font-bold mb-4">Create New List</h2>
            <input
              type="text"
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddList()}
              placeholder="e.g., Kitchen Remodel Project"
              className="w-full bg-highlighter text-pencil placeholder-pencil-light p-3 rounded-md mb-4 focus:outline-none focus:ring-2 focus:ring-ink border-2 border-pencil"
              autoFocus
            />
            <div className="flex justify-end gap-3">
              <button onClick={() => setIsAdding(false)} className="px-4 py-2 bg-transparent md:hover:bg-highlighter border-2 border-pencil rounded-md transition-colors">Cancel</button>
              <button onClick={handleAddList} className="px-4 py-2 bg-ink md:hover:bg-ink-light text-pencil font-bold rounded-md transition-colors">Create</button>
            </div>
          </div>
        </div>
      )}

      {userSettings && (
        <CustomizeModal 
          isOpen={isCustomizeModalOpen}
          onClose={() => setIsCustomizeModalOpen(false)}
          settings={userSettings}
          onSave={onUpdateUserSettings}
        />
      )}

      {listsForRender.length > 0 ? (
        <div 
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
          onDrop={handleDropOnList}
          onDragOver={(e) => e.preventDefault()}
        >
          {listsForRender.map((list) => (
            <ListItemTile
              key={list.id}
              list={list}
              onClick={() => !draggedList && onSelectList(list.id)}
              onDragStart={(e) => handleDragStart(e, list)}
              onDragOver={(e) => handleDragOverList(e, list)}
              onDragEnd={handleDragEnd}
              isDragging={draggedList?.id === list.id}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-20 border-2 border-dashed border-pencil/30 rounded-lg">
          <p className="text-pencil-light text-xl">No lists yet. Create one to get started!</p>
        </div>
      )}
      
      <Bin 
        isVisible={isDraggingForDelete} 
        onDrop={() => {
          if (draggedList) {
            setListToDelete(draggedList);
          }
        }}
      />
      
      <ConfirmationModal
        isOpen={!!listToDelete}
        title="Delete List"
        message={`Are you sure you want to permanently delete the "${listToDelete?.name}" list? This action cannot be undone.`}
        onConfirm={handleConfirmDelete}
        onCancel={() => setListToDelete(null)}
        confirmText="Delete"
      />
    </div>
  );
};

export default ListPage;