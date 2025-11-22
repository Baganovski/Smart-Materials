
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ShoppingList, UserSettings } from '../types';
import ListItemTile from './ListItemTile';
import Bin from './Bin';
import ConfirmationModal from './ConfirmationModal';
import CustomizeModal from './CustomizeModal';
// Fix: Import 'firebase' directly to avoid using a global declaration and potential scope conflicts.
import { auth, firebase } from '../firebase';
import ChevronDownIcon from './icons/ChevronDownIcon';
import HistoryModal from './HistoryModal';
import UserIcon from './icons/UserIcon';
import CogIcon from './icons/CogIcon';
import AccountSettingsModal from './AccountSettingsModal';
import AppLogoIcon from './icons/AppLogoIcon';
import HistoryIcon from './icons/HistoryIcon';
import CoffeeIcon from './icons/CoffeeIcon';
import PencilIcon from './icons/PencilIcon';

interface ListPageProps {
  lists: ShoppingList[];
  user: any;
  userSettings: UserSettings | null;
  onAddList: (name: string, statusGroupId: string) => void;
  onDeleteList: (id: string) => void;
  onSelectList: (id: string) => void;
  onSignOut: () => void;
  onUpdateList: (list: ShoppingList) => void;
  onUpdateUserSettings: (settings: UserSettings) => void;
  onDeleteAccount: () => void;
  onSignIn?: () => void;
}

const ListPage: React.FC<ListPageProps> = ({ lists, user, userSettings, onAddList, onDeleteList, onSelectList, onSignOut, onUpdateList, onUpdateUserSettings, onDeleteAccount, onSignIn }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [selectedStatusGroupId, setSelectedStatusGroupId] = useState<string>('');
  const [isCustomizeModalOpen, setIsCustomizeModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isAccountSettingsOpen, setIsAccountSettingsOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const [isDeleteAccountConfirmOpen, setIsDeleteAccountConfirmOpen] = useState(false);
  
  // State for custom template dropdown
  const [isTemplateDropdownOpen, setIsTemplateDropdownOpen] = useState(false);
  const templateDropdownRef = useRef<HTMLDivElement>(null);
  
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
      if (templateDropdownRef.current && !templateDropdownRef.current.contains(event.target as Node)) {
        setIsTemplateDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [userMenuRef, templateDropdownRef]);

  useEffect(() => {
    // When the "add list" modal opens, reset the form and set the default workflow
    if (isAdding) {
      setNewListName('');
      setIsTemplateDropdownOpen(false);
      if (userSettings && userSettings.statusGroups.length > 0) {
        setSelectedStatusGroupId(userSettings.statusGroups[0].id);
      }
    }
  }, [isAdding, userSettings]);


  const handleAddList = () => {
    if (newListName.trim() && selectedStatusGroupId) {
      onAddList(newListName.trim(), selectedStatusGroupId);
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
    
    let newCreatedAt;
    if (user) {
        newCreatedAt = firebase.firestore.Timestamp.fromMillis(newTimestampMs);
    } else {
        newCreatedAt = new Date(newTimestampMs).toISOString();
    }
    
    onUpdateList({ ...draggedList, createdAt: newCreatedAt });
  };
  
  const handleConfirmDelete = () => {
    if (listToDelete) {
      onDeleteList(listToDelete.id);
      setListToDelete(null);
    }
  };
  
  const handleConfirmAccountDelete = () => {
    setIsDeleteAccountConfirmOpen(false);
    onDeleteAccount();
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-4xl mx-auto pb-48">
      <header className="flex justify-between items-center mb-8 gap-4">
        <div className="flex items-center gap-3">
            <AppLogoIcon className="w-10 h-10 sm:w-12 sm:h-12" />
            <h1 className="text-5xl sm:text-6xl font-bold text-pencil">Listfully</h1>
        </div>
        <div className="flex items-center gap-3">
           <button
            onClick={() => setIsCustomizeModalOpen(true)}
            className="bg-transparent md:hover:bg-highlighter border-2 border-pencil rounded-full w-12 h-12 flex items-center justify-center transition-transform transform md:hover:scale-110 focus:outline-none focus:ring-2 focus:ring-ink focus:ring-offset-2 focus:ring-offset-paper"
            aria-label="Customize list styles"
          >
            <PencilIcon className="w-6 h-6" />
          </button>
          <button
            onClick={() => setIsAdding(true)}
            className="bg-ink md:hover:bg-ink-light text-pencil rounded-full w-12 h-12 flex items-center justify-center text-3xl font-bold transition-transform transform md:hover:scale-110 focus:outline-none focus:ring-2 focus:ring-ink focus:ring-offset-2 focus:ring-offset-paper"
            aria-label="Add new list"
          >
            +
          </button>
          
          {user ? (
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
             <div className={`absolute top-10 right-0 w-56 bg-paper border-2 border-pencil rounded-xl shadow-sketchy transition-opacity duration-200 z-10 ${isUserMenuOpen ? 'opacity-100 visible' : 'opacity-0 invisible'}`}>
                <div className="p-3 border-b border-pencil/20">
                  <p className="font-bold truncate">{user.displayName || user.email}</p>
                  <p className="text-sm text-pencil-light truncate">{user.email}</p>
                </div>
                <button 
                  onClick={() => { setIsHistoryModalOpen(true); setIsUserMenuOpen(false); }}
                  className="w-full text-left px-3 py-2 md:hover:bg-highlighter transition-colors flex items-center gap-2"
                >
                  <HistoryIcon className="w-4 h-4" />
                  Item History
                </button>
                <a
                  href="https://monzo.me/josephshaw1?h=m4-M5r"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full text-left px-3 py-2 md:hover:bg-highlighter transition-colors border-t border-pencil/20 flex items-center gap-2 text-pencil no-underline"
                  onClick={() => setIsUserMenuOpen(false)}
                >
                  <CoffeeIcon className="w-4 h-4" />
                  Buy me a coffee
                </a>
                <button 
                  onClick={() => { setIsAccountSettingsOpen(true); setIsUserMenuOpen(false); }} 
                  className="w-full text-left px-3 py-2 md:hover:bg-highlighter transition-colors border-t border-pencil/20 flex items-center gap-2"
                >
                  <CogIcon className="w-4 h-4" />
                  Settings
                </button>
                <button 
                  onClick={onSignOut} 
                  className="w-full text-left px-3 py-2 md:hover:bg-highlighter transition-colors border-t border-pencil/20 rounded-b-xl flex items-center gap-2"
                >
                  <UserIcon className="w-4 h-4" />
                  Sign Out
                </button>
             </div>
           </div>
          ) : (
            <>
                {/* Mobile: Circular Icon Button */}
                <button
                    onClick={onSignIn}
                    className="sm:hidden w-12 h-12 rounded-full border-2 border-pencil cursor-pointer bg-highlighter flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-ink focus:ring-offset-2 focus:ring-offset-paper transition-transform transform active:scale-95"
                    aria-label="Sign In"
                >
                    <UserIcon className="w-6 h-6" />
                </button>

                {/* Desktop: Pill Text Button */}
                <button
                    onClick={onSignIn}
                    className="hidden sm:flex px-5 h-12 rounded-full border-2 border-pencil cursor-pointer bg-highlighter items-center justify-center font-bold text-lg focus:outline-none focus:ring-2 focus:ring-ink focus:ring-offset-2 focus:ring-offset-paper transition-transform transform md:hover:scale-105"
                    aria-label="Sign In"
                >
                    Sign In
                </button>
            </>
          )}
        </div>
      </header>

      {isAdding && userSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-pop-in">
          <div className="bg-paper p-6 rounded-2xl border-2 border-pencil shadow-sketchy w-full max-w-sm overflow-visible">
            <h2 className="text-2xl font-bold mb-4">Create New List</h2>
            <div className="mb-4">
                <label htmlFor="list-name-input" className="block text-sm font-bold text-pencil-light mb-1">List Name</label>
                <input
                    id="list-name-input"
                    type="text"
                    value={newListName}
                    onChange={(e) => setNewListName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddList()}
                    placeholder="e.g., Kitchen Remodel Project"
                    className="w-full bg-paper text-pencil placeholder-pencil-light p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-ink border-2 border-pencil"
                    autoFocus
                    maxLength={50}
                />
            </div>

            <div className="mb-6">
                <label htmlFor="template-select" className="block text-sm font-bold text-pencil-light mb-1">List Style</label>
                <div className="relative" ref={templateDropdownRef}>
                    <button
                        type="button"
                        id="template-select"
                        onClick={() => setIsTemplateDropdownOpen(!isTemplateDropdownOpen)}
                        className="w-full bg-paper text-pencil p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-ink border-2 border-pencil flex justify-between items-center"
                    >
                        <span className="truncate mr-2">
                            {userSettings.statusGroups.find(g => g.id === selectedStatusGroupId)?.name || 'Select Style'}
                        </span>
                        <ChevronDownIcon className="w-5 h-5 flex-shrink-0"/>
                    </button>
                    
                    {isTemplateDropdownOpen && (
                        <div className="absolute top-full mt-1 left-0 w-full bg-paper border-2 border-pencil rounded-xl shadow-sketchy z-20 overflow-hidden max-h-48 overflow-y-auto">
                            {userSettings.statusGroups.map(group => (
                                <button
                                    key={group.id}
                                    type="button"
                                    onClick={() => {
                                        setSelectedStatusGroupId(group.id);
                                        setIsTemplateDropdownOpen(false);
                                    }}
                                    className={`w-full text-left p-3 transition-colors ${
                                        selectedStatusGroupId === group.id 
                                        ? 'bg-sticky-note font-bold' 
                                        : 'hover:bg-highlighter'
                                    }`}
                                >
                                    {group.name}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
            
            <div className="flex justify-end gap-3">
              <button onClick={() => setIsAdding(false)} className="px-4 py-2 bg-transparent md:hover:bg-highlighter border-2 border-pencil rounded-full transition-colors">Cancel</button>
              <button onClick={handleAddList} className="px-4 py-2 bg-ink md:hover:bg-ink-light text-pencil font-bold rounded-full transition-colors">Create</button>
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

      {user && (
         <HistoryModal 
            isOpen={isHistoryModalOpen}
            onClose={() => setIsHistoryModalOpen(false)}
            user={user}
        />
      )}

      {user && (
        <AccountSettingsModal
            isOpen={isAccountSettingsOpen}
            onClose={() => setIsAccountSettingsOpen(false)}
            user={user}
            onRequestDeleteAccount={() => setIsDeleteAccountConfirmOpen(true)}
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
              userSettings={userSettings}
              onClick={() => !draggedList && onSelectList(list.id)}
              onDragStart={(e) => handleDragStart(e, list)}
              onDragOver={(e) => handleDragOverList(e, list)}
              onDragEnd={handleDragEnd}
              isDragging={draggedList?.id === list.id}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-20 border-2 border-dashed border-pencil/30 rounded-2xl px-6">
          <p className="text-pencil-light text-xl">No lists yet. Create one to get started!</p>
          {!user && (
            <p className="text-pencil-light mt-2">
              Or <button onClick={onSignIn} className="text-ink font-bold hover:underline">sign in</button> to see your lists.
            </p>
          )}
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

      <ConfirmationModal
        isOpen={isDeleteAccountConfirmOpen}
        title="Delete Account"
        message="Are you sure? This will permanently delete your account and ALL of your lists. This action cannot be undone."
        onConfirm={handleConfirmAccountDelete}
        onCancel={() => setIsDeleteAccountConfirmOpen(false)}
        confirmText="Delete Account"
        requireVerification={user?.email}
        verificationInstruction="Please type your email address to confirm deletion:"
      />
    </div>
  );
};

export default ListPage;
