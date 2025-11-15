import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { ShoppingList, ShoppingListItem, UserSettings, StatusGroup } from '../types';
import ChevronLeftIcon from './icons/ChevronLeftIcon';
import PlusIcon from './icons/PlusIcon';
import TrashIcon from './icons/TrashIcon';
import ArrowUpOnSquareIcon from './icons/ArrowUpOnSquareIcon';
import ClipboardIcon from './icons/ClipboardIcon';
import DragHandleIcon from './icons/DragHandleIcon';
import PencilIcon from './icons/PencilIcon';
import IconRenderer from './icons/IconRenderer';
import ArrowsUpDownIcon from './icons/ArrowsUpDownIcon';
import ConfirmationModal from './ConfirmationModal';
import ChevronDownIcon from './icons/ChevronDownIcon';


type SortOption = 'custom' | 'a-z' | 'z-a' | 'status';

interface ShoppingListPageProps {
  list: ShoppingList;
  userSettings: UserSettings;
  onBack: () => void;
  onUpdateList: (list: ShoppingList) => void;
}

const ShoppingListPage: React.FC<ShoppingListPageProps> = ({ list, userSettings, onBack, onUpdateList }) => {
  const [items, setItems] = useState<ShoppingListItem[]>(list.items || []);
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
  const [groupToChange, setGroupToChange] = useState<StatusGroup | null>(null);
  const sortMenuRef = useRef<HTMLDivElement>(null);
  const groupMenuRef = useRef<HTMLDivElement>(null);

  const activeGroup = useMemo(() => 
    userSettings.statusGroups.find(g => g.id === list.statusGroupId) || userSettings.statusGroups[0] || { id: 'fallback', name: 'Default', statuses: [] },
    [list.statusGroupId, userSettings.statusGroups]
  );
  
  const statusMap = useMemo(() => 
    new Map(activeGroup.statuses.map(s => [s.id, s])), 
    [activeGroup.statuses]
  );
  
  // Change body background color to feel like we're on the sticky note
  useEffect(() => {
    document.body.classList.remove('bg-paper');
    document.body.classList.add('bg-sticky-note');

    return () => {
      document.body.classList.add('bg-paper');
      document.body.classList.remove('bg-sticky-note');
    };
  }, []);
  
  useEffect(() => {
    setItems(list.items || []);
  }, [list.items]);
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sortMenuRef.current && !sortMenuRef.current.contains(event.target as Node)) {
        setIsSortMenuOpen(false);
      }
      if (groupMenuRef.current && !groupMenuRef.current.contains(event.target as Node)) {
        setIsGroupMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const sortedItems = useMemo(() => {
    // Return a new sorted array, but don't modify the original `items` state
    // so the custom order is preserved.
    const itemsCopy = [...items];
    switch (sortBy) {
        case 'a-z':
            itemsCopy.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
            break;
        case 'z-a':
            itemsCopy.sort((a, b) => b.name.localeCompare(a.name, undefined, { sensitivity: 'base' }));
            break;
        case 'status':
            const statusOrder = new Map(activeGroup.statuses.map((s, i) => [s.id, i]));
            itemsCopy.sort((a, b) => {
                // Fix: Resolve TypeScript error by explicitly handling cases where a status might not
                // be found in the status map, preventing arithmetic operations on potentially undefined values.
                // Items with a status not in the current workflow are sorted to the end.
                const aIndex = statusOrder.get(a.status);
                const bIndex = statusOrder.get(b.status);

                if (aIndex !== undefined && bIndex !== undefined) {
                    // Both items have a status, so sort by their order in the workflow.
                    if (aIndex === bIndex) {
                        return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
                    }
                    return aIndex - bIndex;
                }
                
                if (aIndex !== undefined) { // Only 'a' has a valid status, so it comes first.
                    return -1;
                }
                
                if (bIndex !== undefined) { // Only 'b' has a valid status, so it comes first.
                    return 1;
                }
                
                // Neither item has a valid status, so sort by name.
                return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
            });
            break;
        case 'custom':
        default:
            return items; // Return original order from state
    }
    return itemsCopy;
  }, [items, sortBy, activeGroup.statuses]);


  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newItemName.trim();
    const quantity = parseInt(newItemQty, 10) || 1;
    if (!name) return;
    
    const newItem: ShoppingListItem = {
        id: Date.now().toString(),
        name,
        quantity,
        status: activeGroup.statuses[0]?.id || 'listed', // Default to first status
    };

    onUpdateList({ ...list, items: [newItem, ...items] });
    setNewItemName('');
    setNewItemQty('1');
  };

  const handleCycleStatus = (id: string) => {
    const newItems = items.map(item => {
      if (item.id === id) {
        const currentIndex = activeGroup.statuses.findIndex(s => s.id === item.status);
        const nextIndex = (currentIndex + 1) % activeGroup.statuses.length;
        return { ...item, status: activeGroup.statuses[nextIndex].id };
      }
      return item;
    });
    onUpdateList({ ...list, items: newItems });
  };

  const handleDeleteItem = (id: string) => {
    onUpdateList({ ...list, items: items.filter(item => item.id !== id) });
  };
  
  const handleUpdateItemQuantity = (id: string, newQuantityStr: string) => {
    const newQuantity = parseInt(newQuantityStr, 10);
    const itemToUpdate = items.find(i => i.id === id);

    if (!itemToUpdate || isNaN(newQuantity) || newQuantity <= 0) {
        setEditingQuantityItemId(null);
        return;
    }
    
    if (newQuantity === itemToUpdate.quantity) {
      setEditingQuantityItemId(null);
      return;
    }

    const newItems = items.map(item =>
        item.id === id ? { ...item, quantity: newQuantity } : item
    );
    onUpdateList({ ...list, items: newItems });
    setEditingQuantityItemId(null);
};

const handleUpdateItemName = (id: string, newName: string) => {
    const trimmedName = newName.trim();
    setEditingNameItemId(null);
    
    const itemToUpdate = items.find(i => i.id === id);
    if (!itemToUpdate || !trimmedName || trimmedName === itemToUpdate.name) {
        return;
    }
    
    const newItems = items.map(item =>
        item.id === id ? { 
            ...item, 
            name: trimmedName, 
        } : item
    );
    onUpdateList({ ...list, items: newItems });
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
    
    const dragFromIndex = items.findIndex(item => item.id === draggedItem.id);
    if (dragFromIndex === -1) return;

    if (dropIndicatorIndex === dragFromIndex || dropIndicatorIndex === dragFromIndex + 1) {
        return;
    }

    const newItems = [...items];
    const [movedItem] = newItems.splice(dragFromIndex, 1);
    
    const finalDropIndex = dropIndicatorIndex > dragFromIndex ? dropIndicatorIndex - 1 : dropIndicatorIndex;

    newItems.splice(finalDropIndex, 0, movedItem);

    onUpdateList({ ...list, items: newItems });
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
    
    onUpdateList({ ...list, name: trimmedName });
  };

  const confirmGroupChange = () => {
    if (!groupToChange) return;

    const newGroupStatusIds = new Set(groupToChange.statuses.map(s => s.id));
    const firstStatusOfNewGroup = groupToChange.statuses[0]?.id;

    const updatedItems = items.map(item => {
        if (!newGroupStatusIds.has(item.status)) {
            return { ...item, status: firstStatusOfNewGroup || '' };
        }
        return item;
    });

    onUpdateList({ ...list, statusGroupId: groupToChange.id, items: updatedItems });
    setGroupToChange(null);
  };

  const printableList = useMemo(() => {
    const title = `List: ${list.name}\n====================\n\n`;

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
  }, [sortedItems, list.name, activeGroup.statuses]);

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
  
  const SortButton: React.FC<{ value: SortOption; label: string; }> = ({ value, label }) => (
    <button
      onClick={() => {
        setSortBy(value);
        setIsSortMenuOpen(false);
      }}
      className={`w-full text-left px-3 py-2 transition-colors ${sortBy === value ? 'bg-ink/50 font-bold' : 'md:hover:bg-highlighter'}`}
    >
      <span>{label}</span>
    </button>
  );

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-4xl mx-auto">
      <header className="mb-6">
        <div className="flex items-center mb-4">
            <button onClick={onBack} className="mr-4 p-2 rounded-full md:hover:bg-highlighter transition-colors" aria-label="Go back">
                <ChevronLeftIcon className="w-8 h-8" />
            </button>
            <div className="flex-grow min-w-0">
                {isEditingTitle ? (
                    <input
                        type="text"
                        defaultValue={list.name}
                        autoFocus
                        onFocus={(e) => e.target.select()}
                        className="w-full bg-highlighter text-pencil p-1 -m-1 rounded-md text-4xl sm:text-5xl font-bold focus:outline-none focus:ring-2 focus:ring-ink border-2 border-pencil"
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
                    />
                ) : (
                    <h1
                        onClick={() => setIsEditingTitle(true)}
                        className="group text-4xl sm:text-5xl font-bold cursor-pointer md:hover:bg-highlighter p-1 -m-1 rounded-md transition-colors flex items-center gap-2 border-2 border-transparent truncate"
                        title="Click to rename"
                    >
                        <span className="truncate">{list.name}</span>
                        <PencilIcon className="w-6 h-6 text-pencil-light opacity-0 md:group-hover:opacity-100 transition-opacity flex-shrink-0" />
                    </h1>
                )}
            </div>
        </div>
        
        <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <span className="text-pencil-light">{items.length} {items.length === 1 ? 'item' : 'items'}</span>
              <div className="relative" ref={groupMenuRef}>
                  <button onClick={() => setIsGroupMenuOpen(prev => !prev)} className="flex items-center gap-2 text-pencil md:hover:bg-highlighter/50 transition-colors border-2 border-pencil/20 rounded-md px-3 py-1 max-w-48" aria-haspopup="true" aria-expanded={isGroupMenuOpen}>
                      <span className="truncate" title={activeGroup.name}>{activeGroup.name}</span>
                      <ChevronDownIcon className="w-4 h-4 flex-shrink-0" />
                  </button>
                  <div className={`absolute top-full mt-1 left-0 w-56 bg-paper border-2 border-pencil rounded-md shadow-sketchy transition-opacity duration-200 z-10 overflow-hidden ${isGroupMenuOpen ? 'opacity-100 visible' : 'opacity-0 invisible'}`}>
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
            </div>

            <div className="flex items-center gap-1">
                <div className="relative" ref={sortMenuRef}>
                    <button
                        onClick={() => setIsSortMenuOpen(prev => !prev)}
                        className="bg-transparent md:hover:bg-highlighter border-2 border-pencil rounded-full p-3 transition-transform transform md:hover:scale-110 focus:outline-none focus:ring-2 focus:ring-ink focus:ring-offset-2 focus:ring-offset-paper"
                        aria-label="Sort items"
                        aria-haspopup="true"
                        aria-expanded={isSortMenuOpen}
                    >
                        <ArrowsUpDownIcon className="w-6 h-6"/>
                    </button>
                    <div className={`absolute top-10 right-0 w-48 bg-paper border-2 border-pencil rounded-md shadow-sketchy transition-opacity duration-200 z-10 overflow-hidden ${isSortMenuOpen ? 'opacity-100 visible' : 'opacity-0 invisible'}`}>
                        <p className="font-bold text-pencil-light text-sm px-3 pt-2">Sort by</p>
                        <SortButton value="custom" label="Custom Order" />
                        <SortButton value="a-z" label="A-Z" />
                        <SortButton value="z-a" label="Z-A" />
                        <SortButton value="status" label="Status" />
                    </div>
                </div>
                <button
                    onClick={() => setIsPrintModalOpen(true)}
                    className="p-3 rounded-full md:hover:bg-highlighter transition-colors"
                    aria-label="Export list"
                >
                    <ArrowUpOnSquareIcon className="w-7 h-7" />
                </button>
            </div>
        </div>
      </header>
      
      {isPrintModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-pop-in">
          <div className="bg-paper p-6 rounded-lg border-2 border-pencil shadow-sketchy w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4">Export List</h2>
            <textarea
              readOnly
              className="w-full h-64 bg-highlighter text-pencil placeholder-pencil-light p-3 rounded-md mb-4 focus:outline-none focus:ring-2 focus:ring-ink border-2 border-pencil resize-y"
              value={printableList}
              aria-label="Printable item list"
            />
            <div className="flex justify-end gap-3">
              <button onClick={() => setIsPrintModalOpen(false)} className="px-4 py-2 bg-transparent md:hover:bg-highlighter border-2 border-pencil rounded-md transition-colors">Close</button>
              <button onClick={handleCopyToClipboard} className="px-4 py-2 bg-ink md:hover:bg-ink-light text-pencil font-bold rounded-md transition-colors flex items-center gap-2 w-28 justify-center">
                <ClipboardIcon className="w-5 h-5" />
                <span>{copyButtonText}</span>
              </button>
            </div>
          </div>
        </div>
      )}
      
      <ConfirmationModal
        isOpen={!!groupToChange}
        title="Change Workflow"
        message={`Are you sure you want to change this list's workflow to "${groupToChange?.name}"? The status of items that don't match the new workflow will be reset.`}
        onConfirm={confirmGroupChange}
        onCancel={() => setGroupToChange(null)}
        confirmText="Change"
      />


      <form onSubmit={handleAddItem} className="mb-6 grid grid-cols-[70px_1fr_auto] gap-3 items-center">
        <input
            type="number"
            value={newItemQty}
            onChange={(e) => setNewItemQty(e.target.value)}
            placeholder="Qty"
            min="1"
            className="w-full bg-paper p-3 rounded-md focus:outline-none focus:ring-2 focus:ring-ink border-2 border-pencil"
            aria-label="Quantity"
        />
        <input
          type="text"
          value={newItemName}
          onChange={(e) => setNewItemName(e.target.value)}
          placeholder="Add a new item..."
          className="w-full bg-paper p-3 rounded-md focus:outline-none focus:ring-2 focus:ring-ink border-2 border-pencil"
          aria-label="New item name"
        />
        <button type="submit" className="bg-ink md:hover:bg-ink-light text-pencil rounded-md p-3 transition-colors flex justify-center items-center" aria-label="Add item">
          <PlusIcon />
        </button>
      </form>

      <div 
        className="space-y-1 mb-8 min-h-[200px]"
        onDrop={sortBy === 'custom' ? handleDrop : undefined}
        onDragOver={(e) => e.preventDefault()}
      >
        {sortedItems.length > 0 ? sortedItems.map((item, index) => {
          const currentStatus = statusMap.get(item.status);
          const isDraggable = sortBy === 'custom';
          const isDragging = draggedItem?.id === item.id;
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
                <div className={`mr-2 ${isDraggable ? 'cursor-grab' : 'cursor-default'}`}>
                  <DragHandleIcon className="w-6 h-6 text-pencil/30 md:group-hover:text-pencil/60 transition-colors" />
                </div>
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
                                    autoFocus
                                    onFocus={(e) => e.target.select()}
                                    className="bg-highlighter text-pencil w-20 px-2 py-1 rounded-md text-xl font-bold focus:outline-none focus:ring-2 focus:ring-ink appearance-none [-moz-appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none border-2 border-pencil"
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
                                className="font-bold p-1 -ml-1 rounded-md transition-colors cursor-pointer md:hover:bg-highlighter"
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
                              className="bg-highlighter text-pencil w-full px-2 py-1 rounded-md text-xl focus:outline-none focus:ring-2 focus:ring-ink border-2 border-pencil"
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
                            />
                          ) : (
                            <span 
                              onClick={() => setEditingNameItemId(item.id)}
                              className="inline-block w-full p-1 -ml-1 rounded-md transition-colors cursor-pointer md:hover:bg-highlighter"
                            >
                              {item.name}
                            </span>
                          )}
                        </div>
                    </div>
                </div>
                <button onClick={() => handleDeleteItem(item.id)} className="p-2 rounded-full md:hover:bg-danger/10 text-pencil-light md:hover:text-danger transition-colors" aria-label={`Delete ${item.name}`}>
                  <TrashIcon className="w-5 h-5" />
                </button>
              </div>
            </React.Fragment>
          );
        }) : (
            <div className="text-center py-10 border-2 border-dashed border-pencil/30 rounded-lg">
                <p className="text-pencil-light text-xl">No items yet. Add one above to start your list.</p>
            </div>
        )}
        {dropIndicatorIndex === items.length && (
          <div className="h-1.5 bg-ink rounded-full my-1 transition-all"></div>
        )}
      </div>
    </div>
  );
};

export default ShoppingListPage;