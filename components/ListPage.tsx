import React, { useState } from 'react';
import { ShoppingList } from '../types';
import ListItemTile from './ListItemTile';
import Bin from './Bin';
import PlusIcon from './icons/PlusIcon';
import UserIcon from './icons/UserIcon';
import ConfirmationModal from './ConfirmationModal';

// Fix: Add firebase declaration to provide an object for the global types.
declare const firebase: any;

interface ListPageProps {
  lists: ShoppingList[];
  user: any;
  onAddList: (name: string) => void;
  onDeleteList: (id: string) => void;
  onSelectList: (id: string) => void;
  onSignOut: () => void;
  onUpdateList: (list: ShoppingList) => void;
}

const ListPage: React.FC<ListPageProps> = ({ lists, user, onAddList, onDeleteList, onSelectList, onSignOut, onUpdateList }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newListName, setNewListName] = useState('');
  
  // State for drag-to-delete
  const [isDraggingForDelete, setIsDraggingForDelete] = useState(false);
  const [listToDelete, setListToDelete] = useState<ShoppingList | null>(null);

  // State for drag-to-reorder
  const [draggedList, setDraggedList] = useState<ShoppingList | null>(null);
  const [dropIndicatorIndex, setDropIndicatorIndex] = useState<number | null>(null);

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

  const handleDragStart = (e: React.DragEvent, list: ShoppingList) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', list.id);
    // Defer state update to allow browser to capture the drag image before the element's style changes.
    // This prevents the "ghost" image from flickering or capturing the placeholder style.
    setTimeout(() => {
      setIsDraggingForDelete(true);
      setDraggedList(list);
    }, 0);
  };

  const handleDragEnd = () => {
    setIsDraggingForDelete(false);
    setDraggedList(null);
    setDropIndicatorIndex(null);
  };

  const handleDragOverList = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (!draggedList || draggedList.id === sortedLists[index].id) return;

    const target = e.currentTarget as HTMLDivElement;
    const rect = target.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const height = rect.height;

    // Prevent flickering by creating a "dead zone" in the middle of the tile.
    // The indicator only changes when the cursor is in the top or bottom 35% of the tile.
    const threshold = height * 0.35;
    
    let newDropIndex: number | null = dropIndicatorIndex; // Default to current value

    if (y < threshold) {
      newDropIndex = index;
    } else if (y > height - threshold) {
      newDropIndex = index + 1;
    }
    // If in the middle 30%, `newDropIndex` remains `dropIndicatorIndex`, so no state change occurs.

    if (newDropIndex !== dropIndicatorIndex) {
      setDropIndicatorIndex(newDropIndex);
    }
  };

  const handleDropOnList = () => {
    if (draggedList === null || dropIndicatorIndex === null) return;
    
    const dragFromIndex = sortedLists.findIndex(list => list.id === draggedList.id);
    if (dragFromIndex === -1) return;

    // Calculate the target index in the array *after* the dragged item is notionally removed.
    const targetIndex = dropIndicatorIndex > dragFromIndex ? dropIndicatorIndex - 1 : dropIndicatorIndex;

    // If the item is dropped in its original position, do nothing.
    if (targetIndex === dragFromIndex) {
      return;
    }

    // To correctly find the neighbors, we look at the list as if the dragged item wasn't there.
    const otherLists = sortedLists.filter(l => l.id !== draggedList.id);

    // The item before the drop position.
    const prevList = otherLists[targetIndex - 1] || null;
    // The item at the drop position (which will be pushed down).
    const nextList = otherLists[targetIndex] || null;

    const getTimestamp = (dateValue: any): number => {
        if (!dateValue) return new Date().getTime();
        if (typeof dateValue === 'object' && dateValue.toDate) {
            return dateValue.toDate().getTime();
        }
        if (typeof dateValue === 'string') {
            return new Date(dateValue).getTime();
        }
        return new Date().getTime();
    };

    let newTimestampMs;

    // Lists are sorted descending by timestamp (newest first).
    const prevTime = prevList ? getTimestamp(prevList.createdAt) : 0;
    const nextTime = nextList ? getTimestamp(nextList.createdAt) : 0;

    if (prevList && nextList) {
        // Dropped between two items: find the midpoint.
        newTimestampMs = (prevTime + nextTime) / 2;
    } else if (prevList) {
        // Dropped at the end: make it slightly older than the last item.
        newTimestampMs = prevTime - 1000; 
    } else if (nextList) {
        // Dropped at the beginning: make it slightly newer than the first item.
        newTimestampMs = nextTime + 1000;
    } else {
        // This case should not happen in a list with more than one item.
        return; 
    }
    
    if (!newTimestampMs || isNaN(newTimestampMs)) {
      console.error("Failed to calculate a valid timestamp for reordering.");
      return;
    }

    // Fix: Use the globally typed firebase object to access Timestamp.
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
        <h1 className="text-5xl sm:text-6xl font-bold text-pencil">Sticky Tickys</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsAdding(true)}
            className="bg-ink hover:bg-ink-light text-pencil rounded-full p-3 transition-transform transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-ink focus:ring-offset-2 focus:ring-offset-paper"
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
              <button onClick={handleAddList} className="px-4 py-2 bg-ink hover:bg-ink-light text-pencil font-bold rounded-md transition-colors">Create</button>
            </div>
          </div>
        </div>
      )}

      {sortedLists.length > 0 ? (
        <div 
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
          onDrop={handleDropOnList}
          onDragOver={(e) => e.preventDefault()}
        >
          {sortedLists.map((list, index) => (
            <ListItemTile
              key={list.id}
              list={list}
              onClick={() => !draggedList && onSelectList(list.id)}
              onDragStart={(e) => handleDragStart(e, list)}
              onDragOver={(e) => handleDragOverList(e, index)}
              onDragEnd={handleDragEnd}
              isDragging={draggedList?.id === list.id}
              showDropIndicatorBefore={dropIndicatorIndex === index}
              showDropIndicatorAfter={index === sortedLists.length - 1 && dropIndicatorIndex === sortedLists.length}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-20 border-2 border-dashed border-pencil/30 rounded-lg">
          <p className="text-pencil-light text-xl">No job lists yet. Create one to get started!</p>
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