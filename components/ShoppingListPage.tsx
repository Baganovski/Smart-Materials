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
    
    setItems(prevItems => 
        prevItems.map(item => {
            if (item.id === newItemId) {
                if (result !== 'error' && result.length > 0) {
                    const sortedSuggestions = result.sort((a, b) => a.totalPrice - b.totalPrice);
                    return { ...item, cost: 'select', suggestions: sortedSuggestions };
                } else {
                    return { ...item, cost: 'error' };
                }
            }
            return item;
        })
    );
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
          <div className="bg-paper p-6 rounded-lg border-2 border-pencil shadow-sketchy w-full max-w-lg">
            <h2 className="text-2xl font-bold mb-4">Select a product for "{itemForSelection.name}"</h2>
            {(itemForSelection.suggestions && itemForSelection.suggestions.length > 0) ? (
                <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                    {itemForSelection.suggestions.map((suggestion, index) => (
                        <div
                            key={index}
                            className="w-full text-left p-4 bg-highlighter/50 border-2 border-pencil rounded-md transition-colors"
                        >
                            <div className="flex justify-between items-start gap-4 mb-3">
                                <div className="flex-grow pr-4">
                                    <p className="font-semibold text-pencil">{suggestion.name}</p>
                                    <p className="text-sm text-ink-light font-semibold">{suggestion.supplier}</p>
                                </div>
                                <div className="text-right text-pencil flex-shrink-0">
                                    <div className="font-bold text-ink text-lg whitespace-nowrap">
                                        {country.symbol}{suggestion.totalPrice.toFixed(2)}
                                    </div>
                                    <div className="text-sm text-pencil-light whitespace-nowrap">
                                        {country.symbol}{suggestion.pricePerUnit.toFixed(2)} / item &times; {itemForSelection.quantity}
                                    </div>
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 border-t-2 border-dashed border-pencil/20 pt-3">
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
                                    className="px-3 py-1 bg-ink hover:bg-ink-light text-white rounded-md transition-colors text-sm font-semibold"
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
             <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setSelectingItemId(null)} className="px-4 py-2 bg-transparent hover:bg-highlighter border-2 border-pencil rounded-md transition-colors">Cancel</button>
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
                    <span className={`flex-1 ${item.completed ? 'line-through' : ''}`}>
                      {item.productUrl ? (
                        <a 
                          href={item.productUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="underline hover:text-ink transition-colors"
                        >
                          {item.name}
                        </a>
                      ) : (
                        item.name
                      )}
                    </span>
                </div>
            </div>
            <div className="text-right mr-4 w-40 text-pencil font-bold text-xl flex justify-end items-center">
              {item.cost === 'searching' && (
                  <div className="flex items-center justify-end gap-2 text-pencil-light text-base font-normal">
                      <SpinnerIcon className="w-5 h-5" />
                      <span>Searching...</span>
                  </div>
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
                  <button
                      onClick={() => setEditingItemId(item.id)}
                      className="flex items-center gap-1.5 cursor-pointer p-1 rounded-md hover:bg-danger/10 text-danger transition-colors text-base font-normal"
                      aria-label={`Set cost for ${item.name}`}
                  >
                      <AlertTriangleIcon className="w-5 h-5" />
                      <span>Set Cost</span>
                  </button>
              )}

              {typeof item.cost === 'number' && editingItemId !== item.id && (
                  <span onClick={() => setEditingItemId(item.id)} className="cursor-pointer p-1 rounded-md hover:bg-highlighter transition-colors whitespace-nowrap">
                    {`${country.symbol}${item.cost.toFixed(2)}`}
                  </span>
              )}

              {editingItemId === item.id && (
                  <div className="relative flex items-center w-full">
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