import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ShoppingList, ShoppingListItem, ItemStatus } from '../types';
import ChevronLeftIcon from './icons/ChevronLeftIcon';
import PlusIcon from './icons/PlusIcon';
import TrashIcon from './icons/TrashIcon';
import PrintIcon from './icons/PrintIcon';
import ClipboardIcon from './icons/ClipboardIcon';
import SquareIcon from './icons/SquareIcon';
import TruckIcon from './icons/TruckIcon';
import CheckSquareIcon from './icons/CheckSquareIcon';
import ArrowUturnLeftIcon from './icons/ArrowUturnLeftIcon';
import DragHandleIcon from './icons/DragHandleIcon';
import PencilIcon from './icons/PencilIcon';

const statusOrder: ItemStatus[] = ['listed', 'ordered', 'collected', 'returned'];

const StatusIcon: React.FC<{ status: ItemStatus }> = ({ status }) => {
    switch (status) {
        case 'ordered':
            return <TruckIcon className="w-6 h-6 text-blue-600" />;
        case 'collected':
            return <CheckSquareIcon className="w-6 h-6 text-ink" />;
        case 'returned':
            return <ArrowUturnLeftIcon className="w-6 h-6 text-danger" />;
        case 'listed':
        default:
            return <SquareIcon className="w-6 h-6 text-pencil-light" />;
    }
};


interface ShoppingListPageProps {
  list: ShoppingList;
  onBack: () => void;
  onUpdateList: (list: ShoppingList) => void;
}

const ShoppingListPage: React.FC<ShoppingListPageProps> = ({ list, onBack, onUpdateList }) => {
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
  
  const stableOnUpdateList = useCallback(onUpdateList, [onUpdateList]);
  
  // Change body background color to feel like we're on the sticky note
  useEffect(() => {
    document.body.classList.remove('bg-paper');
    document.body.classList.add('bg-sticky-note');

    // Cleanup function to restore the original background color when the component unmounts.
    return () => {
      document.body.classList.add('bg-paper');
      document.body.classList.remove('bg-sticky-note');
    };
  }, []); // Empty dependency array ensures this runs only on mount and unmount.
  
  useEffect(() => {
    // Only call update if the items have actually changed from the prop
    if (JSON.stringify(items) !== JSON.stringify(list.items || [])) {
      stableOnUpdateList({ ...list, items });
    }
  }, [items, list, stableOnUpdateList]);

  // Sync local state if the list prop changes from upstream
  useEffect(() => {
    setItems(list.items || []);
  }, [list.items]);


  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newItemName.trim();
    const quantity = parseInt(newItemQty, 10) || 1;
    if (!name) return;
    
    const newItem: ShoppingListItem = {
        id: Date.now().toString(),
        name,
        quantity,
        status: 'listed',
    };

    setItems(prevItems => [newItem, ...prevItems]);
    setNewItemName('');
    setNewItemQty('1');
  };

  const handleCycleStatus = (id: string) => {
    setItems(prevItems =>
      prevItems.map(item => {
        if (item.id === id) {
          const currentIndex = statusOrder.indexOf(item.status);
          const nextIndex = (currentIndex + 1) % statusOrder.length;
          return { ...item, status: statusOrder[nextIndex] };
        }
        return item;
      })
    );
  };

  const handleDeleteItem = (id: string) => {
    setItems(prevItems => prevItems.filter(item => item.id !== id));
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

    setItems(prevItems =>
        prevItems.map(item =>
            item.id === id ? { ...item, quantity: newQuantity } : item
        )
    );
    setEditingQuantityItemId(null);
};

const handleUpdateItemName = (id: string, newName: string) => {
    const trimmedName = newName.trim();
    setEditingNameItemId(null);
    
    const itemToUpdate = items.find(i => i.id === id);
    if (!itemToUpdate || !trimmedName || trimmedName === itemToUpdate.name) {
        return;
    }
    
    setItems(prevItems =>
      prevItems.map(item =>
        item.id === id ? { 
            ...item, 
            name: trimmedName, 
        } : item
      )
    );
};

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, item: ShoppingListItem) => {
    setDraggedItem(item);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', item.id); 
  };
  
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    e.preventDefault();
    if (!draggedItem || draggedItem.id === items[index].id) return;
    
    const target = e.currentTarget;
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

    setItems(newItems);
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

  const printableList = useMemo(() => {
    const title = `List: ${list.name}\n====================\n\n`;

    if (items.length === 0) {
      return `List: ${list.name}\n====================\n\nNo items in this list.`;
    }

    const groupedItems = items.reduce((acc, item) => {
      const status = item.status;
      if (!acc[status]) {
        acc[status] = [];
      }
      acc[status].push(item);
      return acc;
    }, {} as Record<ItemStatus, ShoppingListItem[]>);

    const listBody = statusOrder.map(status => {
      const itemsForStatus = groupedItems[status];
      if (!itemsForStatus || itemsForStatus.length === 0) {
        return '';
      }
      
      const statusTitle = status.charAt(0).toUpperCase() + status.slice(1);
      const itemsString = itemsForStatus
        .map(item => `  - ${item.quantity}x ${item.name}`)
        .join('\n');

      return `${statusTitle}:\n${itemsString}`;
    }).filter(Boolean).join('\n\n');
    
    return `${title}${listBody}`;
  }, [items, list.name]);

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

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-4xl mx-auto">
      <header className="flex items-center mb-8">
        <button onClick={onBack} className="mr-4 p-2 rounded-full hover:bg-highlighter transition-colors" aria-label="Go back">
          <ChevronLeftIcon className="w-8 h-8" />
        </button>
        <div className="flex-grow">
          {isEditingTitle ? (
            <input
              type="text"
              defaultValue={list.name}
              autoFocus
              onFocus={(e) => e.target.select()}
              className="w-full bg-highlighter text-pencil p-1 -m-1 rounded-md text-4xl sm:text-5xl font-bold mb-1 focus:outline-none focus:ring-2 focus:ring-ink border-2 border-pencil"
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
              className="group text-4xl sm:text-5xl font-bold mb-1 cursor-pointer hover:bg-highlighter p-1 -m-1 rounded-md transition-colors flex items-center gap-2 border-2 border-transparent"
              title="Click to rename"
            >
              <span>{list.name}</span>
              <PencilIcon className="w-6 h-6 text-pencil-light opacity-0 group-hover:opacity-100 transition-opacity" />
            </h1>
          )}
          <p className="text-pencil-light px-1">{items.length} {items.length === 1 ? 'item' : 'items'} listed</p>
        </div>
        <button 
          onClick={() => setIsPrintModalOpen(true)} 
          className="p-3 rounded-full hover:bg-highlighter transition-colors" 
          aria-label="Open printable list"
        >
          <PrintIcon className="w-7 h-7" />
        </button>
      </header>
      
      {isPrintModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-pop-in">
          <div className="bg-paper p-6 rounded-lg border-2 border-pencil shadow-sketchy w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4">Printable List</h2>
            <textarea
              readOnly
              className="w-full h-64 bg-highlighter text-pencil placeholder-pencil-light p-3 rounded-md mb-4 focus:outline-none focus:ring-2 focus:ring-ink border-2 border-pencil resize-y"
              value={printableList}
              aria-label="Printable item list"
            />
            <div className="flex justify-end gap-3">
              <button onClick={() => setIsPrintModalOpen(false)} className="px-4 py-2 bg-transparent hover:bg-highlighter border-2 border-pencil rounded-md transition-colors">Close</button>
              <button onClick={handleCopyToClipboard} className="px-4 py-2 bg-ink hover:bg-ink-light text-pencil font-bold rounded-md transition-colors flex items-center gap-2 w-28 justify-center">
                <ClipboardIcon className="w-5 h-5" />
                <span>{copyButtonText}</span>
              </button>
            </div>
          </div>
        </div>
      )}

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
        <button type="submit" className="bg-ink hover:bg-ink-light text-pencil rounded-md p-3 transition-colors flex justify-center items-center" aria-label="Add item">
          <PlusIcon />
        </button>
      </form>

      <div 
        className="space-y-1 mb-8 min-h-[200px]"
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
      >
        {items.length > 0 ? items.map((item, index) => {
          const isDone = item.status === 'collected' || item.status === 'returned';
          const isDragging = draggedItem?.id === item.id;
          return (
            <React.Fragment key={item.id}>
              {dropIndicatorIndex === index && (
                  <div className="h-1.5 bg-ink rounded-full my-1 transition-all"></div>
              )}
              <div 
                draggable={!isDone}
                onDragStart={(e) => !isDone && handleDragStart(e, item)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                className={`flex items-center p-4 transition-all group ${ isDone ? 'opacity-60' : '' } ${ isDragging ? 'opacity-30' : '' } border-b-2 border-dashed border-pencil/10`}
              >
                <div className={`mr-2 ${!isDone ? 'cursor-grab' : 'cursor-default'}`}>
                  <DragHandleIcon className="w-6 h-6 text-pencil/30 group-hover:text-pencil/60 transition-colors" />
                </div>
                <button
                  onClick={() => handleCycleStatus(item.id)}
                  className="p-1 mr-2"
                  aria-label={`Change status for ${item.name}, current status is ${item.status}`}
                >
                  <StatusIcon status={item.status} />
                </button>
                <div className="flex-1">
                    <div className={`flex items-center gap-3 text-xl ${isDone ? 'text-pencil-light' : 'text-pencil'}`}>
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
                                <span className={`font-bold ${isDone ? 'line-through' : ''}`}>x</span>
                            </>
                        ) : (
                            <span
                                onClick={() => !isDone && setEditingQuantityItemId(item.id)}
                                className={`font-bold p-1 -ml-1 rounded-md transition-colors ${!isDone ? 'cursor-pointer hover:bg-highlighter' : 'cursor-default'}`}
                            >
                                {item.quantity}x
                            </span>
                        )}
                        <div className={`flex-1 ${isDone ? 'line-through' : ''}`}>
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
                              onClick={() => !isDone && setEditingNameItemId(item.id)}
                              className={`inline-block w-full p-1 -ml-1 rounded-md transition-colors ${!isDone ? 'cursor-pointer hover:bg-highlighter' : 'cursor-default'}`}
                            >
                              {item.name}
                            </span>
                          )}
                        </div>
                    </div>
                </div>
                <button onClick={() => handleDeleteItem(item.id)} className="p-2 rounded-full hover:bg-danger/10 text-pencil-light hover:text-danger transition-colors" aria-label={`Delete ${item.name}`}>
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