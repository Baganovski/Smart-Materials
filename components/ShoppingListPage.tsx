
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { ShoppingList, ShoppingListItem, UserSettings, StatusGroup } from '../types';
import ChevronLeftIcon from './icons/ChevronLeftIcon';
import TrashIcon from './icons/TrashIcon';
import ArrowUpOnSquareIcon from './icons/ArrowUpOnSquareIcon';
import ClipboardIcon from './icons/ClipboardIcon';
import DragHandleIcon from './icons/DragHandleIcon';
import PencilIcon from './icons/PencilIcon';
import IconRenderer from './icons/IconRenderer';
import ArrowsUpDownIcon from './icons/ArrowsUpDownIcon';
import ConfirmationModal from './ConfirmationModal';
import ChevronDownIcon from './icons/ChevronDownIcon';
import CheckIcon from './icons/CheckIcon';
import ArrowUturnLeftIcon from './icons/ArrowUturnLeftIcon';
import ArrowUturnRightIcon from './icons/ArrowUturnRightIcon';
import PaletteIcon from './icons/PaletteIcon';
import * as historyService from '../services/historyService';
import { NOTE_COLORS } from '../utils/defaults';


type SortOption = 'custom' | 'a-z' | 'z-a' | 'status';

interface ShoppingListPageProps {
  list: ShoppingList;
  userSettings: UserSettings;
  onBack: () => void;
  onUpdateList: (list: ShoppingList) => void;
}

const ShoppingListPage: React.FC<ShoppingListPageProps> = ({ list, userSettings, onBack, onUpdateList }) => {
  const [newItemName, setNewItemName] = useState('');
  const [newItemQty, setNewItemQty] = useState('1');
  const [editingQuantityItemId, setEditingQuantityItemId] = useState<string | null>(null);
  const [editingNameItemId, setEditingNameItemId] = useState<string | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [copyButtonText, setCopyButtonText] = useState('Copy');
  const [draggedItem, setDraggedItem] = useState<ShoppingListItem | null>(null);
  const [dropIndicatorIndex, setDropIndicatorIndex] = useState<number | null>(null);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('custom');
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);
  const [isGroupMenuOpen, setIsGroupMenuOpen] = useState(false);
  const [isColorMenuOpen, setIsColorMenuOpen] = useState(false);
  const [groupToChange, setGroupToChange] = useState<StatusGroup | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const sortMenuRef = useRef<HTMLDivElement>(null);
  const groupMenuRef = useRef<HTMLDivElement>(null);
  const colorMenuRef = useRef<HTMLDivElement>(null);
  const transitionalItemsRef = useRef<ShoppingListItem[] | null>(null);

  // Undo/Redo Stacks
  const [undoStack, setUndoStack] = useState<ShoppingList[]>([]);
  const [redoStack, setRedoStack] = useState<ShoppingList[]>([]);

  // For history suggestions
  const [historyItems, setHistoryItems] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const activeGroup = useMemo(() => 
    userSettings.statusGroups.find(g => g.id === list.statusGroupId) || userSettings.statusGroups[0] || { id: 'fallback', name: 'Default', statuses: [] },
    [list.statusGroupId, userSettings.statusGroups]
  );
  
  const statusMap = useMemo(() => 
    new Map(activeGroup.statuses.map(s => [s.id, s])), 
    [activeGroup.statuses]
  );
  
  // Handle dynamic body background color based on the list's color
  useEffect(() => {
    // Remove default classes
    document.body.classList.remove('bg-paper');
    
    // Set custom color directly on the body to avoid flashing backgrounds
    const listColor = list.color || NOTE_COLORS[0]; // Default to first color (Yellow) if undefined
    document.body.style.backgroundColor = listColor;

    return () => {
      document.body.style.backgroundColor = ''; // Reset inline style
      document.body.classList.add('bg-paper'); // Restore default class
    };
  }, [list.color]);
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sortMenuRef.current && !sortMenuRef.current.contains(event.target as Node)) {
        setIsSortMenuOpen(false);
      }
      if (groupMenuRef.current && !groupMenuRef.current.contains(event.target as Node)) {
        setIsGroupMenuOpen(false);
      }
      if (colorMenuRef.current && !colorMenuRef.current.contains(event.target as Node)) {
        setIsColorMenuOpen(false);
      }
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node)) {
        setSuggestions([]);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    // Guest lists don't support history to avoid database permissions issues
    if (list.uid === 'guest') return;
    
    historyService.getHistory(list.uid)
      .then(items => {
        setHistoryItems(items);
      })
      .catch(err => console.error("Failed to fetch history:", err));
  }, [list.uid]);

  useEffect(() => {
    // Clear the transitional state after every render to prevent it from being stale.
    transitionalItemsRef.current = null;
  });

  // --- History Management ---

  const performUpdate = useCallback((updatedList: ShoppingList) => {
    // Push current state to undo stack before updating
    setUndoStack(prev => [...prev, list]);
    // Clear redo stack when a new action is performed
    setRedoStack([]);
    // Perform the update
    onUpdateList(updatedList);
  }, [list, onUpdateList]);

  const handleUndo = useCallback(() => {
    if (undoStack.length === 0) return;

    const previousState = undoStack[undoStack.length - 1];
    const newUndoStack = undoStack.slice(0, -1);

    // Push current state to redo stack
    setRedoStack(prev => [...prev, list]);
    setUndoStack(newUndoStack);
    
    // Restore previous state (bypassing performUpdate to avoid pushing to undo stack again)
    onUpdateList(previousState);
  }, [undoStack, list, onUpdateList]);

  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) return;

    const nextState = redoStack[redoStack.length - 1];
    const newRedoStack = redoStack.slice(0, -1);

    // Push current state to undo stack
    setUndoStack(prev => [...prev, list]);
    setRedoStack(newRedoStack);

    // Restore next state
    onUpdateList(nextState);
  }, [redoStack, list, onUpdateList]);

  // --- Sorting ---

  const sortedItems = useMemo(() => {
    const itemsCopy = [...(list.items || [])];
    switch (sortBy) {
        case 'a-z':
            return itemsCopy.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
        case 'z-a':
            return itemsCopy.sort((a, b) => b.name.localeCompare(a.name, undefined, { sensitivity: 'base' }));
        case 'status':
            const statusOrder = new Map(activeGroup.statuses.map((s, i) => [s.id, i]));
            return itemsCopy.sort((a, b) => {
                const aIndex = statusOrder.get(a.status) ?? Infinity;
                const bIndex = statusOrder.get(b.status) ?? Infinity;

                if (aIndex < bIndex) {
                    return -1;
                }
                if (aIndex > bIndex) {
                    return 1;
                }
                
                return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
            });
        case 'custom':
        default:
            return itemsCopy; 
    }
  }, [list.items, sortBy, activeGroup.statuses]);

  const itemsToRender = transitionalItemsRef.current || sortedItems;

  const handleSortChange = (option: SortOption) => {
    setSortBy(option);
    setIsSortMenuOpen(false);
  };
  
  const addItemToList = useCallback(async (name: string, quantity: number) => {
    const trimmedName = name.trim();
    if (!trimmedName) return;

    const newItem: ShoppingListItem = {
      id: Date.now().toString(),
      name: trimmedName,
      quantity,
      status: activeGroup.statuses[0]?.id || 'listed',
    };

    performUpdate({ ...list, items: [newItem, ...(list.items || [])] });

    // Only update history for authenticated users
    if (list.uid !== 'guest') {
        try {
            await historyService.addHistoryItem(list.uid, trimmedName);
            setHistoryItems(prev => {
                const lowerCaseName = trimmedName.toLowerCase();
                if (prev.some(i => i.toLowerCase() === lowerCaseName)) {
                return prev;
                }
                return [...prev, lowerCaseName].sort();
            });
        } catch (err) {
            console.error("Failed to update history:", err);
        }
    }
  }, [activeGroup.statuses, list, performUpdate, list.uid]);

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    addItemToList(newItemName, parseInt(newItemQty, 10) || 1);
    setNewItemName('');
    setNewItemQty('1');
    setSuggestions([]);
  };

  const handleNewItemNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setNewItemName(value);

    if (value.trim().length > 0 && historyItems.length > 0) {
        const lowerCaseValue = value.toLowerCase();
        // Don't suggest the exact same thing they've already typed
        const filtered = historyItems.filter(item => 
            item.toLowerCase().includes(lowerCaseValue) && item.toLowerCase() !== lowerCaseValue
        ).slice(0, 5); // Limit to 5 suggestions
        setSuggestions(filtered);
    } else {
        setSuggestions([]);
    }
  };

  const handleCycleStatus = (id: string) => {
    const getNextStatusId = (currentStatus: string): string => {
        const currentStatusIndex = activeGroup.statuses.findIndex(s => s.id === currentStatus);
        const nextStatusIndex = (currentStatusIndex + 1) % activeGroup.statuses.length;
        return activeGroup.statuses[nextStatusIndex].id;
    };
    
    if (sortBy === 'status') {
      // When sorted by status, changing a status should lock the current
      // visual order and switch the sort mode to 'custom'.
      const newItemsInLockedOrder = sortedItems.map(item => 
        item.id === id ? { ...item, status: getNextStatusId(item.status) } : item
      );
      // "Freeze" the visual state for the transitional render
      transitionalItemsRef.current = newItemsInLockedOrder;
      setSortBy('custom');
      performUpdate({ ...list, items: newItemsInLockedOrder });
    } else {
      // For all other sort modes, just update the item's status in the canonical list.
      const canonicalItems = list.items || [];
      const newItems = canonicalItems.map(item => 
        item.id === id ? { ...item, status: getNextStatusId(item.status) } : item
      );
      performUpdate({ ...list, items: newItems });
    }
  };
  
  const handleUpdateItemQuantity = (id: string, newQuantityStr: string) => {
    const canonicalItems = list.items || [];
    const newQuantity = parseInt(newQuantityStr, 10);
    const itemToUpdate = canonicalItems.find(i => i.id === id);

    if (!itemToUpdate || isNaN(newQuantity) || newQuantity <= 0) {
        setEditingQuantityItemId(null);
        return;
    }
    
    if (newQuantity === itemToUpdate.quantity) {
      setEditingQuantityItemId(null);
      return;
    }

    const newItems = canonicalItems.map(item =>
        item.id === id ? { ...item, quantity: newQuantity } : item
    );
    performUpdate({ ...list, items: newItems });
    setEditingQuantityItemId(null);
};

const handleUpdateItemName = (id: string, newName: string) => {
    const canonicalItems = list.items || [];
    const trimmedName = newName.trim();
    setEditingNameItemId(null);
    
    const itemToUpdate = canonicalItems.find(i => i.id === id);
    if (!itemToUpdate || !trimmedName || trimmedName === itemToUpdate.name) {
        return;
    }
    
    const newItems = canonicalItems.map(item =>
        item.id === id ? { 
            ...item, 
            name: trimmedName, 
        } : item
    );
    performUpdate({ ...list, items: newItems });
};

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, item: ShoppingListItem) => {
    setDraggedItem(item);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', item.id); 
  };
  
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    e.preventDefault();
    if (!draggedItem || draggedItem.id === sortedItems[index].id) return;
    
    const target = e.currentTarget;
    const rect = target.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const height = rect.height;

    const threshold = height * 0.35;

    let newDropIndex: number | null = dropIndicatorIndex; 

    if (y < threshold) {
        newDropIndex = index;
    } else if (y > height - threshold) {
        newDropIndex = index + 1;
    }

    if (newDropIndex !== dropIndicatorIndex) {
        setDropIndicatorIndex(newDropIndex);
    }
  };
  
  const handleDrop = () => {
    if (draggedItem === null || dropIndicatorIndex === null) return;
    
    const canonicalItems = list.items || [];
    const dragFromIndex = canonicalItems.findIndex(item => item.id === draggedItem.id);
    if (dragFromIndex === -1) return;

    if (dropIndicatorIndex === dragFromIndex || dropIndicatorIndex === dragFromIndex + 1) {
        return;
    }

    const newItems = [...canonicalItems];
    const [movedItem] = newItems.splice(dragFromIndex, 1);
    
    const finalDropIndex = dropIndicatorIndex > dragFromIndex ? dropIndicatorIndex - 1 : dropIndicatorIndex;

    newItems.splice(finalDropIndex, 0, movedItem);

    performUpdate({ ...list, items: newItems });
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
    setDropIndicatorIndex(null);
  };

  const handleUpdateListName = (newName: string) => {
    const trimmedName = newName.trim();
    setIsEditingTitle(false);

    if (!trimmedName || trimmedName === list.name) {
      return;
    }
    
    performUpdate({ ...list, name: trimmedName });
  };

  const confirmGroupChange = () => {
    if (!groupToChange) return;

    const firstStatusOfNewGroup = groupToChange.statuses[0]?.id;

    const updatedItems = (list.items || []).map(item => ({
        ...item,
        status: firstStatusOfNewGroup || '',
    }));

    performUpdate({ ...list, statusGroupId: groupToChange.id, items: updatedItems });
    setGroupToChange(null);
  };

  
  const handleBlurDelete = (itemId: string) => {
    setTimeout(() => {
      setPendingDeleteId(currentPendingId => {
        if (currentPendingId === itemId) {
          return null; 
        }
        return currentPendingId; 
      });
    }, 150);
  };
  
  const handleColorChange = (color: string) => {
      performUpdate({ ...list, color });
      setIsColorMenuOpen(false);
  }

  const printableList = useMemo(() => {
    const title = `List: ${list.name}\n====================\n\n`;
    const items = list.items || [];

    if (items.length === 0) {
      return `List: ${list.name}\n====================\n\nNo items in this list.`;
    }

    const groupedItems = sortedItems.reduce((acc, item) => {
      const statusId = item.status;
      if (!acc[statusId]) {
        acc[statusId] = [];
      }
      acc[statusId].push(item);
      return acc;
    }, {} as Record<string, ShoppingListItem[]>);

    const listBody = activeGroup.statuses.map(status => {
      const itemsForStatus = groupedItems[status.id];
      if (!itemsForStatus || itemsForStatus.length === 0) {
        return '';
      }
      
      const statusTitle = status.name.charAt(0).toUpperCase() + status.name.slice(1);
      const itemsString = itemsForStatus
        .map(item => `  - ${item.quantity}x ${item.name}`)
        .join('\n');

      return `${statusTitle}:\n${itemsString}`;
    }).filter(Boolean).join('\n\n');
    
    return `${title}${listBody}`;
  }, [sortedItems, list.name, list.items, activeGroup.statuses]);

  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(printableList).then(() => {
        setCopyButtonText('Copied!');
        setTimeout(() => setCopyButtonText('Copy'), 2000);
    }).catch(err => {
        console.error('Failed to copy text: ', err);
        setCopyButtonText('Failed!');
        setTimeout(() => setCopyButtonText('Copy'), 2000);
    });
  };
  
  const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-4xl mx-auto">
      <header className="mb-6">
        <div className="flex items-center gap-3 mb-4">
            <button onClick={onBack} className="bg-transparent md:hover:bg-highlighter border-2 border-pencil rounded-full w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center transition-all transform md:hover:scale-110 focus:outline-none focus:ring-2 focus:ring-ink focus:ring-offset-2 focus:ring-offset-paper flex-shrink-0" aria-label="Go back">
                <ChevronLeftIcon className="w-6 h-6 sm:w-8 sm:h-8" />
            </button>
            <div className="flex-grow min-w-0">
                {isEditingTitle ? (
                    <input
                        type="text"
                        defaultValue={list.name}
                        autoFocus
                        onFocus={(e) => e.target.select()}
                        className="w-full bg-highlighter text-pencil p-1 -m-1 rounded-xl text-4xl sm:text-5xl font-bold focus:outline-none focus:ring-2 focus:ring-ink border-2 border-pencil"
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                handleUpdateListName((e.target as HTMLInputElement).value);
                            }
                            if (e.key === 'Escape') {
                                setIsEditingTitle(false);
                            }
                        }}
                        onBlur={(e) => {
                            handleUpdateListName(e.target.value);
                        }}
                        aria-label="Edit list name"
                        maxLength={50}
                    />
                ) : (
                    <h1
                        onClick={() => setIsEditingTitle(true)}
                        className="group flex items-center gap-2 text-4xl sm:text-5xl font-bold cursor-pointer md:hover:bg-highlighter -m-1 rounded-xl transition-colors border-2 border-transparent"
                        title="Click to rename"
                    >
                        <span className="truncate inline-block pt-3 px-1 pb-3">{list.name}</span>
                        <PencilIcon className="w-6 h-6 text-pencil-light opacity-0 md:group-hover:opacity-100 transition-opacity flex-shrink-0" />
                    </h1>
                )}
            </div>
        </div>
        
        <div className="flex flex-row flex-wrap sm:flex-nowrap justify-between items-center gap-4">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="relative flex-grow sm:flex-grow-0" ref={groupMenuRef}>
                  <button onClick={() => setIsGroupMenuOpen(prev => !prev)} className="flex items-center gap-2 text-pencil md:hover:bg-highlighter/50 transition-colors border-2 border-pencil/20 rounded-full px-3 py-1 w-full sm:w-auto max-w-48 sm:max-w-none" aria-haspopup="true" aria-expanded={isGroupMenuOpen}>
                      <span className="truncate" title={activeGroup.name}>{activeGroup.name}</span>
                      <ChevronDownIcon className="w-4 h-4 flex-shrink-0 ml-auto sm:ml-0" />
                  </button>
                  <div className={`absolute top-full mt-1 left-0 w-full sm:w-56 bg-paper border-2 border-pencil rounded-xl shadow-sketchy transition-opacity duration-200 z-10 overflow-hidden ${isGroupMenuOpen ? 'opacity-100 visible' : 'opacity-0 invisible'}`}>
                      {userSettings.statusGroups.map(group => (
                          <button
                              key={group.id}
                              onClick={() => {
                                  if (group.id !== activeGroup.id) {
                                      setGroupToChange(group);
                                  }
                                  setIsGroupMenuOpen(false);
                              }}
                              disabled={group.id === activeGroup.id}
                              className="w-full text-left px-3 py-2 transition-colors disabled:bg-ink/50 disabled:font-bold md:hover:bg-highlighter"
                          >
                              {group.name}
                          </button>
                      ))}
                  </div>
              </div>
              
               {/* Undo/Redo - Desktop Only */}
               <div className="hidden sm:flex items-center gap-1 border-l-2 border-pencil/10 pl-3">
                    <button
                        onClick={handleUndo}
                        disabled={undoStack.length === 0}
                        className="p-1 text-pencil-light hover:text-ink disabled:opacity-30 transition-colors"
                        aria-label="Undo"
                        title="Undo"
                    >
                        <ArrowUturnLeftIcon className="w-5 h-5" />
                    </button>
                    <button
                        onClick={handleRedo}
                        disabled={redoStack.length === 0}
                        className="p-1 text-pencil-light hover:text-ink disabled:opacity-30 transition-colors"
                        aria-label="Redo"
                        title="Redo"
                    >
                        <ArrowUturnRightIcon className="w-5 h-5" />
                    </button>
               </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                <div className="relative" ref={colorMenuRef}>
                    <button
                        onClick={() => setIsColorMenuOpen(prev => !prev)}
                        className="bg-transparent md:hover:bg-highlighter border-2 border-pencil rounded-full w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center transition-all transform md:hover:scale-110 focus:outline-none focus:ring-2 focus:ring-ink focus:ring-offset-2 focus:ring-offset-paper"
                        aria-label="Change list color"
                        aria-haspopup="true"
                        aria-expanded={isColorMenuOpen}
                    >
                        <PaletteIcon className="w-5 h-5 sm:w-6 sm:h-6"/>
                    </button>
                    <div className={`absolute top-10 right-0 w-48 bg-paper border-2 border-pencil rounded-xl shadow-sketchy transition-opacity duration-200 z-10 p-3 ${isColorMenuOpen ? 'opacity-100 visible' : 'opacity-0 invisible'}`}>
                        <p className="font-bold text-pencil-light text-sm mb-2">Note Color</p>
                        <div className="grid grid-cols-3 gap-2">
                            {NOTE_COLORS.map(color => (
                                <button
                                    key={color}
                                    onClick={() => handleColorChange(color)}
                                    className={`w-10 h-10 rounded-full border-2 transition-transform transform md:hover:scale-110 ${list.color === color ? 'border-pencil ring-2 ring-ink' : 'border-pencil/20'}`}
                                    style={{ backgroundColor: color }}
                                    aria-label={`Select color ${color}`}
                                />
                            ))}
                        </div>
                    </div>
                </div>

                <div className="relative" ref={sortMenuRef}>
                    <button
                        onClick={() => setIsSortMenuOpen(prev => !prev)}
                        className="bg-transparent md:hover:bg-highlighter border-2 border-pencil rounded-full w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center transition-all transform md:hover:scale-110 focus:outline-none focus:ring-2 focus:ring-ink focus:ring-offset-2 focus:ring-offset-paper"
                        aria-label="Sort items"
                        aria-haspopup="true"
                        aria-expanded={isSortMenuOpen}
                    >
                        <ArrowsUpDownIcon className="w-5 h-5 sm:w-6 sm:h-6"/>
                    </button>
                    <div className={`absolute top-10 right-0 w-48 bg-paper border-2 border-pencil rounded-xl shadow-sketchy transition-opacity duration-200 z-10 overflow-hidden ${isSortMenuOpen ? 'opacity-100 visible' : 'opacity-0 invisible'}`}>
                        <p className="font-bold text-pencil-light text-sm px-3 pt-2">Sort by</p>
                        {(['custom', 'a-z', 'z-a', 'status'] as SortOption[]).map(option => {
                            const labels: Record<SortOption, string> = {
                                'custom': 'Custom Order',
                                'a-z': 'A-Z',
                                'z-a': 'Z-A',
                                'status': 'Status',
                            };
                            return (
                                <button
                                    key={option}
                                    onClick={() => handleSortChange(option)}
                                    className={`w-full text-left px-3 py-2 transition-colors ${sortBy === option ? 'bg-ink/50 font-bold' : 'md:hover:bg-highlighter'}`}
                                >
                                    {labels[option]}
                                </button>
                            );
                        })}
                    </div>
                </div>
                <button
                    onClick={() => setIsPrintModalOpen(true)}
                    className="bg-transparent md:hover:bg-highlighter border-2 border-pencil rounded-full w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center transition-all transform md:hover:scale-110 focus:outline-none focus:ring-2 focus:ring-ink focus:ring-offset-2 focus:ring-offset-paper"
                    aria-label="Export list"
                >
                    <ArrowUpOnSquareIcon className="w-6 h-6 sm:w-7 sm:h-7" />
                </button>
            </div>
        </div>
      </header>
      
      {isPrintModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-pop-in p-4">
          <div className="bg-paper p-6 rounded-2xl border-2 border-pencil shadow-sketchy w-full max-w-md h-[75vh] flex flex-col">
            <h2 className="text-2xl font-bold mb-4 flex-shrink-0">Export List</h2>
            <textarea
              readOnly
              className="w-full flex-grow text-pencil placeholder-pencil-light p-3 rounded-xl mb-4 focus:outline-none focus:ring-2 focus:ring-ink border-2 border-pencil resize-none"
              style={{ backgroundColor: list.color || NOTE_COLORS[0] }}
              value={printableList}
              aria-label="Printable item list"
            />
            <div className="flex justify-end gap-3 flex-shrink-0">
              <button onClick={() => setIsPrintModalOpen(false)} className="px-4 py-2 bg-transparent md:hover:bg-highlighter border-2 border-pencil rounded-full transition-colors">Close</button>
              <button onClick={handleCopyToClipboard} className="px-4 py-2 bg-ink md:hover:bg-ink-light text-pencil font-bold rounded-full transition-colors flex items-center gap-2 w-28 justify-center">
                <ClipboardIcon className="w-5 h-5" />
                <span>{copyButtonText}</span>
              </button>
            </div>
          </div>
        </div>
      )}
      
      <ConfirmationModal
        isOpen={!!groupToChange}
        title="Change List Style"
        message={`Are you sure you want to change this list's style to "${groupToChange?.name}"? The status of all items will be reset.`}
        onConfirm={confirmGroupChange}
        onCancel={() => setGroupToChange(null)}
        confirmText="Change"
      />

      <div ref={suggestionsRef} className="relative mb-2">
        <form onSubmit={handleAddItem} className="grid grid-cols-[70px_1fr_auto] gap-3 items-center mb-2">
          <input
              type="number"
              value={newItemQty}
              onChange={(e) => setNewItemQty(e.target.value)}
              placeholder="Qty"
              min="1"
              max="999"
              className="w-full bg-paper p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-ink border-2 border-pencil"
              aria-label="Quantity"
          />
          <input
            type="text"
            value={newItemName}
            onChange={handleNewItemNameChange}
            placeholder="Add a new item..."
            className="w-full bg-paper p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-ink border-2 border-pencil"
            aria-label="New item name"
            autoComplete="off"
            maxLength={100}
          />
          <button 
            type="submit" 
            className="bg-ink md:hover:bg-ink-light text-pencil rounded-full w-12 h-12 flex items-center justify-center text-3xl font-bold transition-transform transform md:hover:scale-110 focus:outline-none focus:ring-2 focus:ring-ink" 
            aria-label="Add item"
          >
            +
          </button>
        </form>
        {suggestions.length > 0 && (
            <div className="absolute top-full -mt-2 w-full bg-paper border-2 border-pencil rounded-2xl shadow-sketchy z-10 max-h-48 overflow-y-auto">
                <ul>
                    {suggestions.map(suggestion => (
                        <li key={suggestion}>
                            <button
                                type="button"
                                className="w-full text-left px-4 py-2 text-lg hover:bg-highlighter transition-colors"
                                onClick={() => {
                                    setNewItemName(capitalize(suggestion));
                                    setSuggestions([]);
                                }}
                            >
                                {capitalize(suggestion)}
                            </button>
                        </li>
                    ))}
                </ul>
            </div>
        )}
      </div>

      <div className="flex items-center gap-2 mb-2 px-1">
          <button
              onClick={handleUndo}
              disabled={undoStack.length === 0}
              className="p-1 text-pencil-light hover:text-ink disabled:opacity-30 transition-colors"
              aria-label="Undo"
              title="Undo"
          >
              <ArrowUturnLeftIcon className="w-5 h-5" />
          </button>
          <button
              onClick={handleRedo}
              disabled={redoStack.length === 0}
              className="p-1 text-pencil-light hover:text-ink disabled:opacity-30 transition-colors"
              aria-label="Redo"
              title="Redo"
          >
              <ArrowUturnRightIcon className="w-5 h-5" />
          </button>
          <span className="text-pencil-light ml-2 text-sm sm:text-base">{(list.items || []).length} {(list.items || []).length === 1 ? 'item' : 'items'}</span>
      </div>

      <div 
        className="space-y-1 mb-8 min-h-[200px]"
        onDrop={sortBy === 'custom' ? handleDrop : undefined}
        onDragOver={(e) => e.preventDefault()}
      >
        {itemsToRender.length > 0 ? itemsToRender.map((item, index) => {
          const currentStatus = statusMap.get(item.status);
          const isDraggable = sortBy === 'custom';
          const isDragging = draggedItem?.id === item.id;
          const isPendingDelete = pendingDeleteId === item.id;
          return (
            <React.Fragment key={item.id}>
              {dropIndicatorIndex === index && (
                  <div className="h-1.5 bg-ink rounded-full my-1 transition-all"></div>
              )}
              <div 
                draggable={isDraggable}
                onDragStart={(e) => isDraggable && handleDragStart(e, item)}
                onDragOver={(e) => isDraggable && handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                className={`flex items-center p-4 transition-all group ${ isDragging ? 'opacity-30' : '' } border-b-2 border-dashed border-pencil/10`}
              >
                {isDraggable && (
                  <div className="mr-2 cursor-grab">
                    <DragHandleIcon className="w-6 h-6 text-pencil/30 md:group-hover:text-pencil/60 transition-colors" />
                  </div>
                )}
                <button
                  onClick={() => handleCycleStatus(item.id)}
                  className="p-1 mr-2"
                  aria-label={`Change status for ${item.name}, current status is ${currentStatus?.name}`}
                >
                  <IconRenderer iconName={currentStatus?.icon || 'SquareIcon'} className="w-6 h-6" style={{ color: currentStatus?.color || '#666666' }} />
                </button>
                <div className="flex-1">
                    <div className="flex items-center gap-3 text-xl text-pencil">
                        {editingQuantityItemId === item.id ? (
                            <>
                                <input
                                    type="number"
                                    defaultValue={item.quantity}
                                    min="1"
                                    max="999"
                                    autoFocus
                                    onFocus={(e) => e.target.select()}
                                    className="bg-highlighter text-pencil w-20 px-2 py-1 rounded-xl text-xl font-bold focus:outline-none focus:ring-2 focus:ring-ink appearance-none [-moz-appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none border-2 border-pencil"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            handleUpdateItemQuantity(item.id, (e.target as HTMLInputElement).value);
                                        }
                                        if (e.key === 'Escape') {
                                            setEditingQuantityItemId(null);
                                        }
                                    }}
                                    onBlur={(e) => {
                                        handleUpdateItemQuantity(item.id, e.target.value);
                                    }}
                                    aria-label={`Edit quantity for ${item.name}`}
                                />
                                <span className="font-bold">x</span>
                            </>
                        ) : (
                            <span
                                onClick={() => setEditingQuantityItemId(item.id)}
                                className="font-bold p-1 -ml-1 rounded-xl transition-colors cursor-pointer md:hover:bg-highlighter"
                            >
                                {item.quantity}x
                            </span>
                        )}
                        <div className="flex-1">
                          {editingNameItemId === item.id ? (
                            <input
                              type="text"
                              defaultValue={item.name}
                              autoFocus
                              onFocus={(e) => e.target.select()}
                              className="bg-highlighter text-pencil w-full px-2 py-1 rounded-xl text-xl focus:outline-none focus:ring-2 focus:ring-ink border-2 border-pencil"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleUpdateItemName(item.id, (e.target as HTMLInputElement).value);
                                }
                                if (e.key === 'Escape') {
                                  setEditingNameItemId(null);
                                }
                              }}
                              onBlur={(e) => {
                                handleUpdateItemName(item.id, e.target.value);
                              }}
                              aria-label={`Edit name for ${item.name}`}
                              maxLength={100}
                            />
                          ) : (
                            <span 
                              onClick={() => setEditingNameItemId(item.id)}
                              className="inline-block w-full p-1 -ml-1 rounded-xl transition-colors cursor-pointer md:hover:bg-highlighter"
                            >
                              {item.name}
                            </span>
                          )}
                        </div>
                    </div>
                </div>
                <button
                  onClick={() => {
                    if (isPendingDelete) {
                      performUpdate({ ...list, items: (list.items || []).filter(i => i.id !== item.id) });
                      setPendingDeleteId(null);
                    } else {
                      setPendingDeleteId(item.id);
                    }
                  }}
                  onBlur={() => handleBlurDelete(item.id)}
                  className={`p-2 transition-all ${isPendingDelete ? 'bg-danger text-white transform scale-110 rounded-full' : 'rounded-full md:hover:bg-danger/10 text-pencil-light md:hover:text-danger'}`}
                  aria-label={isPendingDelete ? `Confirm delete ${item.name}` : `Delete ${item.name}`}
                >
                  {isPendingDelete ? <CheckIcon className="w-5 h-5" /> : <TrashIcon className="w-5 h-5" />}
                </button>
              </div>
            </React.Fragment>
          );
        }) : (
            <div className="text-center py-10 border-2 border-dashed border-pencil/30 rounded-2xl">
                <p className="text-pencil-light text-xl">No items yet. Add one above to start your list.</p>
            </div>
        )}
        {dropIndicatorIndex === itemsToRender.length && (
          <div className="h-1.5 bg-ink rounded-full my-1 transition-all"></div>
        )}
      </div>
    </div>
  );
};

export default ShoppingListPage;
