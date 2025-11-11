import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ShoppingList, ShoppingListItem, Country, ProductSuggestion } from '../types';
import { fetchProductSuggestions } from '../services/geminiService';
import ChevronLeftIcon from './icons/ChevronLeftIcon';
import PlusIcon from './icons/PlusIcon';
import TrashIcon from './icons/TrashIcon';
import SpinnerIcon from './icons/SpinnerIcon';
import AlertTriangleIcon from './icons/AlertTriangleIcon';
import PrintIcon from './icons/PrintIcon';
import ClipboardIcon from './icons/ClipboardIcon';
import ExternalLinkIcon from './icons/ExternalLinkIcon';
import SearchIcon from './icons/SearchIcon';

interface ShoppingListPageProps {
  list: ShoppingList;
  onBack: () => void;
  onUpdateList: (list: ShoppingList) => void;
  country: Country;
}

const ShoppingListPage: React.FC<ShoppingListPageProps> = ({ list, onBack, onUpdateList, country }) => {
  const [items, setItems] = useState<ShoppingListItem[]>(list.items);
  const [newItemName, setNewItemName] = useState('');
  const [newItemQty, setNewItemQty] = useState('1');
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingQuantityItemId, setEditingQuantityItemId] = useState<string | null>(null);
  const [editingNameItemId, setEditingNameItemId] = useState<string | null>(null);
  const [customSources, setCustomSources] = useState(list.sources || '');
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [copyButtonText, setCopyButtonText] = useState('Copy');
  const [includePricesInPrint, setIncludePricesInPrint] = useState(false);

  const [selectingItemId, setSelectingItemId] = useState<string | null>(null);

  const stableOnUpdateList = useCallback(onUpdateList, []);
  useEffect(() => {
    stableOnUpdateList({ ...list, items });
  }, [items, list, stableOnUpdateList]);

  const handleSourcesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCustomSources(e.target.value);
  };

  const handleSourcesBlur = () => {
      if (customSources !== (list.sources || '')) {
          onUpdateList({ ...list, items, sources: customSources });
      }
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newItemName.trim();
    const quantity = parseInt(newItemQty, 10) || 1;
    if (!name) return;
    
    const newItemId = Date.now().toString();
    const newItem: ShoppingListItem = {
        id: newItemId,
        name,
        quantity,
        cost: 'searching',
        completed: false,
    };

    setItems(prevItems => [newItem, ...prevItems]);
    setNewItemName('');
    setNewItemQty('1');

    const result = await fetchProductSuggestions(name, quantity, country, customSources);
    
    setItems(prevItems => {
        const currentItem = prevItems.find(i => i.id === newItemId);
        // If search was cancelled or item was deleted, do not process the result.
        if (!currentItem || currentItem.cost !== 'searching') {
            return prevItems;
        }

        return prevItems.map(item => {
            if (item.id === newItemId) {
                if (result !== 'error' && result.length > 0) {
                    const sortedSuggestions = result.sort((a, b) => a.totalPrice - b.totalPrice);
                    return { ...item, cost: 'select', suggestions: sortedSuggestions };
                } else {
                    return { ...item, cost: 'error' };
                }
            }
            return item;
        });
    });
  };
  
  const handleRejectSuggestions = (itemId: string) => {
    setItems(prevItems =>
        prevItems.map(item => {
            if (item.id === itemId) {
                return {
                    ...item,
                    cost: null, // Revert to manual entry state
                    suggestions: undefined,
                };
            }
            return item;
        })
    );
    setSelectingItemId(null);
  };
  
  const handleSelectSuggestion = (itemId: string, suggestion: ProductSuggestion) => {
    setItems(prevItems =>
        prevItems.map(item => {
            if (item.id === itemId) {
                return {
                    ...item,
                    name: suggestion.name,
                    cost: suggestion.totalPrice,
                    productUrl: suggestion.productUrl,
                    suggestions: undefined,
                };
            }
            return item;
        })
    );
    setSelectingItemId(null);
  };
  
  const handleFindMoreSuggestions = async (itemId: string) => {
    const itemToUpdate = items.find(item => item.id === itemId);
    if (!itemToUpdate) return;

    const existingSuggestions = itemToUpdate.suggestions || [];
    
    // Close modal and set item to searching state
    setSelectingItemId(null);
    setItems(prevItems => 
        prevItems.map(item => 
            item.id === itemId ? { ...item, cost: 'searching' } : item
        )
    );

    const result = await fetchProductSuggestions(
        itemToUpdate.name, 
        itemToUpdate.quantity, 
        country, 
        customSources, 
        existingSuggestions
    );

    setItems(prevItems => {
        const currentItem = prevItems.find(i => i.id === itemId);
        // If search was cancelled or item was deleted, do not process the result.
        if (!currentItem || currentItem.cost !== 'searching') {
            return prevItems;
        }

        return prevItems.map(item => {
            if (item.id === itemId) {
                if (result !== 'error' && result.length > 0) {
                    const combined = [...existingSuggestions, ...result];
                    const uniqueSuggestions = Array.from(new Map(combined.map(s => [s.productUrl, s])).values());
                    const sortedSuggestions = uniqueSuggestions.sort((a, b) => a.totalPrice - b.totalPrice);
                    return { ...item, cost: 'select', suggestions: sortedSuggestions };
                } else {
                    return { ...item, cost: 'select' }; // On failure, revert to 'select' with existing suggestions
                }
            }
            return item;
        });
    });
  };

  const handleCancelSearch = (itemId: string) => {
    setItems(prevItems =>
      prevItems.map(item => {
        if (item.id === itemId && item.cost === 'searching') {
          // If it has suggestions, it was a "Find More" search. Revert to 'select'.
          // Otherwise, it was an initial search. Revert to manual entry state.
          const newCost = (item.suggestions && item.suggestions.length > 0) ? 'select' : 'error';
          return { ...item, cost: newCost };
        }
        return item;
      })
    );
  };
  
  const handleRetrySearch = async (itemId: string) => {
    const itemToRetry = items.find(item => item.id === itemId);
    if (!itemToRetry) return;

    setItems(prevItems =>
      prevItems.map(item =>
        item.id === itemId ? { ...item, cost: 'searching' } : item
      )
    );

    const result = await fetchProductSuggestions(
      itemToRetry.name,
      itemToRetry.quantity,
      country,
      customSources
    );

    setItems(prevItems => {
      const currentItem = prevItems.find(i => i.id === itemId);
      if (!currentItem || currentItem.cost !== 'searching') {
        return prevItems; // Search was cancelled again
      }

      return prevItems.map(item => {
        if (item.id === itemId) {
          if (result !== 'error' && result.length > 0) {
            const sortedSuggestions = result.sort((a, b) => a.totalPrice - b.totalPrice);
            return { ...item, cost: 'select', suggestions: sortedSuggestions };
          } else {
            return { ...item, cost: 'error' };
          }
        }
        return item;
      });
    });
  };

  const handleToggleItem = (id: string) => {
    setItems(prevItems =>
      prevItems.map(item =>
        item.id === id ? { ...item, completed: !item.completed } : item
      )
    );
  };

  const handleDeleteItem = (id: string) => {
    setItems(prevItems => prevItems.filter(item => item.id !== id));
  };

  const handleManualCostChange = (id: string, newCost: string) => {
    const costValue = parseFloat(newCost);
    if (!isNaN(costValue) && costValue >= 0) {
      setItems(prevItems =>
        prevItems.map(item =>
          item.id === id ? { ...item, cost: costValue } : item
        )
      );
    }
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

    let newCost = itemToUpdate.cost;
    if (typeof itemToUpdate.cost === 'number' && itemToUpdate.quantity > 0) {
        const pricePerUnit = itemToUpdate.cost / itemToUpdate.quantity;
        newCost = pricePerUnit * newQuantity;
    }

    setItems(prevItems =>
        prevItems.map(item =>
            item.id === id ? { ...item, quantity: newQuantity, cost: newCost } : item
        )
    );
    setEditingQuantityItemId(null);
};

const handleUpdateItemName = async (id: string, newName: string) => {
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
            cost: 'searching', 
            suggestions: undefined,
            productUrl: undefined,
        } : item
      )
    );
    
    const result = await fetchProductSuggestions(
        trimmedName, 
        itemToUpdate.quantity, 
        country, 
        customSources
    );

    setItems(prevItems => {
        const currentItem = prevItems.find(i => i.id === id);
        if (!currentItem || currentItem.cost !== 'searching') {
            return prevItems;
        }
        
        return prevItems.map(item => {
            if (item.id === id) {
                if (result !== 'error' && result.length > 0) {
                    const sortedSuggestions = result.sort((a, b) => a.totalPrice - b.totalPrice);
                    return { ...item, cost: 'select', suggestions: sortedSuggestions };
                } else {
                    return { ...item, cost: 'error' };
                }
            }
            return item;
        });
    });
};


  const totalCost = useMemo(() => items.reduce((sum, item) => {
    if (typeof item.cost === 'number') {
      return sum + item.cost;
    }
    return sum;
  }, 0), [items]);

  const completedItems = items.filter(item => item.completed).length;

  const printableList = useMemo(() => {
    const title = `Job: ${list.name}\n====================\n`;

    const listBody = items
      .map(item => {
        let line = `${item.quantity}x ${item.name}`;
        if (includePricesInPrint && typeof item.cost === 'number') {
          const priceString = `${country.symbol}${item.cost.toFixed(2)}`;
          line += ` (${priceString})`;
        }
        return line;
      })
      .join('\n');

    let footer = '';
    if (includePricesInPrint && totalCost > 0) {
      const totalString = `${country.symbol}${totalCost.toFixed(2)}`;
      footer = `\n\n--------------------\nTotal: ${totalString}`;
    }
    
    return `${title}${listBody}${footer}`;
  }, [items, includePricesInPrint, country.symbol, totalCost, list.name]);

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

  const itemForSelection = useMemo(() => items.find(item => item.id === selectingItemId), [items, selectingItemId]);

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-4xl mx-auto">
      <header className="flex items-center mb-6">
        <button onClick={onBack} className="mr-4 p-2 rounded-full hover:bg-highlighter transition-colors" aria-label="Go back">
          <ChevronLeftIcon className="w-8 h-8" />
        </button>
        <div className="flex-grow">
          <h1 className="text-4xl sm:text-5xl font-bold">{list.name}</h1>
          <p className="text-pencil-light">{completedItems} of {items.length} materials completed</p>
        </div>
        <button 
          onClick={() => setIsPrintModalOpen(true)} 
          className="p-3 rounded-full hover:bg-highlighter transition-colors" 
          aria-label="Open printable list"
        >
          <PrintIcon className="w-7 h-7" />
        </button>
      </header>
      
      {itemForSelection && (
         <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-pop-in">
          <div className="bg-paper p-6 rounded-lg border-2 border-pencil shadow-sketchy w-full max-w-lg text-base">
            <h2 className="text-2xl font-bold mb-4">Select a product for "{itemForSelection.name}"</h2>
            {(itemForSelection.suggestions && itemForSelection.suggestions.length > 0) ? (
                <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                    {itemForSelection.suggestions.map((suggestion, index) => (
                        <div
                            key={index}
                            className="w-full text-left p-4 bg-yellow-50 border border-yellow-200 rounded-md transition-colors"
                        >
                            <div className="flex justify-between items-start gap-2 mb-3">
                                <div className="flex-grow">
                                    <p className="font-semibold text-pencil break-words">{suggestion.name}</p>
                                    <div className="mt-1">
                                      <span className="text-xs font-bold px-2 py-0.5 bg-ink/20 text-ink rounded-full">{suggestion.supplier}</span>
                                    </div>
                                </div>
                                <div className="text-right text-pencil flex-shrink-0">
                                    <div className="font-bold text-ink text-lg whitespace-nowrap">
                                        {country.symbol}{suggestion.totalPrice.toFixed(2)}
                                    </div>
                                    <div className="text-sm text-pencil-light">
                                        {country.symbol}{suggestion.pricePerUnit.toFixed(2)} / item &times; {itemForSelection.quantity}
                                    </div>
                                </div>
                            </div>
                            <div className="flex justify-end items-center gap-3 border-t-2 border-dashed border-pencil/20 pt-3">
                                <a
                                    href={suggestion.productUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-3 py-1 bg-transparent hover:bg-highlighter border-2 border-pencil rounded-md transition-colors text-sm font-semibold flex items-center gap-2"
                                    aria-label={`View ${suggestion.name} on ${suggestion.supplier}'s website`}
                                >
                                    <ExternalLinkIcon className="w-4 h-4" />
                                    <span>View</span>
                                </a>
                                <button
                                    onClick={() => handleSelectSuggestion(itemForSelection.id, suggestion)}
                                    className="px-3 py-1 bg-ink hover:bg-ink-light text-white rounded-md transition-colors text-sm font-semibold whitespace-nowrap"
                                >
                                    Select Product
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center h-64 flex flex-col justify-center items-center">
                    <p>No suggestions found.</p>
                </div>
            )}
            <div className="text-center text-xs text-pencil-light mt-4 px-4">
              AI-generated suggestions may be inaccurate. Please verify prices and links before purchasing.
            </div>
             <div className="flex justify-end gap-3 mt-4">
              <button onClick={() => setSelectingItemId(null)} className="px-4 py-2 bg-transparent hover:bg-highlighter border-2 border-pencil rounded-md transition-colors">Cancel</button>
               <button 
                onClick={() => handleFindMoreSuggestions(itemForSelection.id)} 
                className="px-4 py-2 bg-transparent hover:bg-highlighter border-2 border-pencil rounded-md transition-colors flex items-center gap-2"
              >
                <SearchIcon className="w-5 h-5" />
                <span>Find More</span>
              </button>
              <button 
                onClick={() => handleRejectSuggestions(itemForSelection.id)} 
                className="px-4 py-2 bg-ink hover:bg-ink-light text-white rounded-md transition-colors"
              >
                Set Price Manually
              </button>
            </div>
          </div>
         </div>
      )}

      {isPrintModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-pop-in">
          <div className="bg-paper p-6 rounded-lg border-2 border-pencil shadow-sketchy w-full max-w-md">
            <h2 className="text-2xl font-bold mb-1">Printable List</h2>
            <p className="text-pencil-light mb-4 truncate">For Job: "{list.name}"</p>
             <div className="flex items-center mb-4">
              <input
                type="checkbox"
                id="include-prices"
                checked={includePricesInPrint}
                onChange={() => setIncludePricesInPrint(!includePricesInPrint)}
                className="w-5 h-5 mr-3 bg-paper border-2 border-pencil rounded-none text-ink focus:ring-ink cursor-pointer"
                aria-label="Include prices in printable list"
              />
              <label htmlFor="include-prices" className="text-pencil select-none cursor-pointer">
                Include Prices
              </label>
            </div>
            <textarea
              readOnly
              className="w-full h-64 bg-highlighter text-pencil placeholder-pencil-light p-3 rounded-md mb-4 focus:outline-none focus:ring-2 focus:ring-ink border-2 border-pencil resize-y"
              value={printableList}
              aria-label="Printable materials list"
            />
            <div className="flex justify-end gap-3">
              <button onClick={() => setIsPrintModalOpen(false)} className="px-4 py-2 bg-transparent hover:bg-highlighter border-2 border-pencil rounded-md transition-colors">Close</button>
              <button onClick={handleCopyToClipboard} className="px-4 py-2 bg-ink hover:bg-ink-light text-white rounded-md transition-colors flex items-center gap-2 w-28 justify-center">
                <ClipboardIcon className="w-5 h-5" />
                <span>{copyButtonText}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mb-6">
        <label htmlFor="custom-sources" className="block text-pencil-light mb-1 ml-1">
            Prioritize Suppliers (optional, comma-separated)
        </label>
        <textarea
            id="custom-sources"
            value={customSources}
            onChange={handleSourcesChange}
            onBlur={handleSourcesBlur}
            placeholder="e.g., screwfix.com, B&Q, travisperkins.co.uk"
            className="w-full bg-paper p-3 rounded-md focus:outline-none focus:ring-2 focus:ring-ink border-2 border-pencil resize-none"
            rows={2}
            aria-label="Prioritized suppliers"
        />
      </div>

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
          placeholder="Add a new material..."
          className="w-full bg-paper p-3 rounded-md focus:outline-none focus:ring-2 focus:ring-ink border-2 border-pencil"
          aria-label="New material name"
        />
        <button type="submit" className="bg-ink hover:bg-ink-light text-white rounded-md p-3 transition-colors flex justify-center items-center" aria-label="Add material">
          <PlusIcon />
        </button>
      </form>

      <div className="space-y-1 mb-8 min-h-[200px]">
        {items.length > 0 ? items.map(item => (
          <div key={item.id} className={`flex items-center p-4 transition-all ${item.completed ? 'opacity-60' : ''} border-b-2 border-dashed border-pencil/10`}>
            <input
              type="checkbox"
              checked={item.completed}
              onChange={() => handleToggleItem(item.id)}
              className="w-5 h-5 mr-4 bg-paper border-2 border-pencil rounded-none text-ink focus:ring-ink"
              aria-label={`Mark ${item.name} as completed`}
            />
            <div className="flex-1">
                <div className={`flex items-center gap-3 text-xl ${item.completed ? 'text-pencil-light' : 'text-pencil'}`}>
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
                            <span className={`font-bold ${item.completed ? 'line-through' : ''}`}>x</span>
                        </>
                    ) : (
                        <span
                            onClick={() => !item.completed && typeof item.cost === 'number' && setEditingQuantityItemId(item.id)}
                            className={`font-bold p-1 -ml-1 rounded-md transition-colors ${!item.completed && typeof item.cost === 'number' ? 'cursor-pointer hover:bg-highlighter' : 'cursor-default'}`}
                        >
                            {item.quantity}x
                        </span>
                    )}
                    <div className={`flex-1 ${item.completed ? 'line-through' : ''}`}>
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
                      ) : item.productUrl ? (
                        <a 
                          href={item.productUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="underline hover:text-ink transition-colors"
                        >
                          {item.name}
                        </a>
                      ) : (
                        <span 
                          onClick={() => !item.completed && setEditingNameItemId(item.id)}
                          className={`inline-block w-full p-1 -ml-1 rounded-md transition-colors ${!item.completed ? 'cursor-pointer hover:bg-highlighter' : 'cursor-default'}`}
                        >
                          {item.name}
                        </span>
                      )}
                    </div>
                </div>
            </div>
            <div className="text-right mr-4 text-pencil font-bold text-xl flex justify-end items-center">
              {item.cost === 'searching' && (
                  <button
                    onClick={() => handleCancelSearch(item.id)}
                    className="group w-28 cursor-pointer rounded-md p-2 hover:bg-danger/10 transition-colors"
                    aria-label={`Cancel search for ${item.name}`}
                  >
                    <p className="text-sm text-pencil-light text-center mb-1 -mt-1 group-hover:text-danger">Searching...</p>
                    <div className="w-full bg-paper border border-pencil/50 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-paper via-ink to-paper bg-[length:200%_100%] h-full rounded-full animate-progress-wave"
                      ></div>
                    </div>
                  </button>
              )}

              {item.cost === 'select' && (
                  <button
                    onClick={() => setSelectingItemId(item.id)}
                    className="px-3 py-1 bg-ink hover:bg-ink-light text-white rounded-md transition-colors text-base font-semibold"
                  >
                      Select Product
                  </button>
              )}
              
              {(item.cost === 'error' || item.cost === null) && editingItemId !== item.id && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleRetrySearch(item.id)}
                      className="p-2 rounded-full hover:bg-highlighter text-pencil-light hover:text-ink transition-colors"
                      aria-label={`Search again for ${item.name}`}
                    >
                      <SearchIcon className="w-5 h-5" />
                    </button>
                    <button
                        onClick={() => setEditingItemId(item.id)}
                        className="flex items-center gap-1.5 cursor-pointer p-1 rounded-md hover:bg-danger/10 text-danger transition-colors text-base font-normal"
                        aria-label={`Set cost for ${item.name}`}
                    >
                        <AlertTriangleIcon className="w-5 h-5" />
                        <span>Set Cost</span>
                    </button>
                  </div>
              )}

              {typeof item.cost === 'number' && editingItemId !== item.id && (
                  <span onClick={() => setEditingItemId(item.id)} className="cursor-pointer p-1 rounded-md hover:bg-highlighter transition-colors whitespace-nowrap">
                    {`${country.symbol}${item.cost.toFixed(2)}`}
                  </span>
              )}

              {editingItemId === item.id && (
                  <div className="relative flex items-center w-28">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-pencil-light font-normal">{country.symbol}</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="Set Cost"
                      defaultValue={typeof item.cost === 'number' ? item.cost.toFixed(2) : ''}
                      autoFocus
                      onFocus={(e) => e.target.select()}
                      className="bg-highlighter text-pencil w-full pl-7 pr-2 py-1 rounded-md text-lg font-normal focus:outline-none focus:ring-2 focus:ring-ink appearance-none [-moz-appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none border-2 border-pencil"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleManualCostChange(item.id, (e.target as HTMLInputElement).value);
                          setEditingItemId(null);
                        }
                        if (e.key === 'Escape') {
                           setEditingItemId(null);
                        }
                      }}
                      onBlur={(e) => {
                        handleManualCostChange(item.id, e.target.value);
                        setEditingItemId(null);
                      }}
                      aria-label={`Manually set cost for ${item.name}`}
                    />
                  </div>
              )}
            </div>
            <button onClick={() => handleDeleteItem(item.id)} className="p-2 rounded-full hover:bg-danger/10 text-pencil-light hover:text-danger transition-colors" aria-label={`Delete ${item.name}`}>
              <TrashIcon className="w-5 h-5" />
            </button>
          </div>
        )) : (
            <div className="text-center py-10 border-2 border-dashed border-pencil/30 rounded-lg">
                <p className="text-pencil-light text-xl">No materials yet. Add one above to start your list.</p>
            </div>
        )}
      </div>

      <footer className="mt-auto pt-6 border-t-4 border-double border-pencil flex justify-between items-center">
        <span className="text-2xl font-semibold text-pencil">Total Estimated Cost</span>
        <div className="text-right">
            <span className="text-4xl font-bold text-ink">
                {`${country.symbol}${totalCost.toFixed(2)}`}
            </span>
        </div>
      </footer>
    </div>
  );
};

export default ShoppingListPage;