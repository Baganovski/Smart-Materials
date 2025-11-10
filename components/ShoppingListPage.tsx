
import React, { useState, useEffect, useCallback } from 'react';
import { ShoppingList, ShoppingListItem, Country } from '../types';
import { fetchItemCost } from '../services/geminiService';
import ChevronLeftIcon from './icons/ChevronLeftIcon';
import PlusIcon from './icons/PlusIcon';
import TrashIcon from './icons/TrashIcon';
import SpinnerIcon from './icons/SpinnerIcon';

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
  const [newItemUnit, setNewItemUnit] = useState<'items' | 'meters'>('items');
  const [editingItemId, setEditingItemId] = useState<string | null>(null);

  const stableOnUpdateList = useCallback(onUpdateList, []);
  useEffect(() => {
    stableOnUpdateList({ ...list, items });
  }, [items, list, stableOnUpdateList]);

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newItemName.trim();
    const quantity = parseInt(newItemQty, 10) || 1;
    if (!name) return;

    const newItem: ShoppingListItem = {
      id: Date.now().toString(),
      name,
      quantity,
      unit: newItemUnit,
      cost: 'loading',
      completed: false,
    };

    setItems(prevItems => [...prevItems, newItem]);
    setNewItemName('');
    setNewItemQty('1');
    setNewItemUnit('items');

    const result = await fetchItemCost(name, quantity, newItemUnit, country);
    
    setItems(prevItems =>
      prevItems.map(item =>
        item.id === newItem.id ? { ...item, cost: result } : item
      )
    );
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


  const totalCost = items.reduce((sum, item) => {
    return sum + (typeof item.cost === 'number' ? item.cost : 0);
  }, 0);
  const completedItems = items.filter(item => item.completed).length;

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-4xl mx-auto">
      <header className="flex items-center mb-8">
        <button onClick={onBack} className="mr-4 p-2 rounded-full hover:bg-slate-800 transition-colors" aria-label="Go back">
          <ChevronLeftIcon className="w-6 h-6" />
        </button>
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold">{list.name}</h1>
          <p className="text-slate-400">{completedItems} of {items.length} materials completed</p>
        </div>
      </header>
      
      <form onSubmit={handleAddItem} className="mb-6 grid grid-cols-[auto_auto_1fr_auto] sm:grid-cols-[100px_120px_1fr_auto] gap-3 items-center">
        <input
            type="number"
            value={newItemQty}
            onChange={(e) => setNewItemQty(e.target.value)}
            placeholder="Qty"
            min="1"
            className="w-full bg-slate-800 p-3 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Quantity"
        />
        <select
          value={newItemUnit}
          onChange={(e) => setNewItemUnit(e.target.value as 'items' | 'meters')}
          className="w-full bg-slate-800 p-3 rounded-md appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Unit"
        >
          <option value="items">items</option>
          <option value="meters">meters</option>
        </select>
        <input
          type="text"
          value={newItemName}
          onChange={(e) => setNewItemName(e.target.value)}
          placeholder="Add a new material..."
          className="w-full bg-slate-800 p-3 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="New material name"
        />
        <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white rounded-md p-3 transition-colors flex justify-center items-center" aria-label="Add material">
          <PlusIcon />
        </button>
      </form>

      <div className="space-y-3 mb-8 min-h-[200px]">
        {items.length > 0 ? items.map(item => (
          <div key={item.id} className={`flex items-center bg-slate-800 p-4 rounded-lg transition-all ${item.completed ? 'opacity-50' : ''}`}>
            <input
              type="checkbox"
              checked={item.completed}
              onChange={() => handleToggleItem(item.id)}
              className="w-6 h-6 mr-4 bg-slate-700 border-slate-600 rounded text-blue-500 focus:ring-blue-500"
              aria-label={`Mark ${item.name} as completed`}
            />
            <div className="flex-1">
              <p className={`text-lg ${item.completed ? 'line-through text-slate-500' : 'text-slate-100'}`}>
                <span className="font-bold">{item.quantity}{item.unit === 'meters' ? 'm' : 'x'}</span> {item.name}
              </p>
            </div>
            <div className="text-right mr-4 w-36 text-sky-400 font-bold text-lg flex justify-end items-center">
              {item.cost === 'loading' && <SpinnerIcon />}
              {item.cost === 'error' || editingItemId === item.id ? (
                 <div className="relative flex items-center w-full">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 font-normal">{country.symbol}</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Set Cost"
                    defaultValue={typeof item.cost === 'number' ? item.cost.toFixed(2) : ''}
                    autoFocus
                    onFocus={(e) => e.target.select()}
                    className="bg-slate-700 text-white w-full pl-7 pr-2 py-1 rounded-md text-base font-normal focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none [-moz-appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
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
              ) : (
                typeof item.cost === 'number' && (
                    <span onClick={() => setEditingItemId(item.id)} className="cursor-pointer p-1 rounded-md hover:bg-slate-700 transition-colors">
                        {`${country.symbol}${item.cost.toFixed(2)}`}
                    </span>
                )
              )}
            </div>
            <button onClick={() => handleDeleteItem(item.id)} className="p-2 rounded-full hover:bg-slate-700 text-slate-500 hover:text-red-400 transition-colors" aria-label={`Delete ${item.name}`}>
              <TrashIcon className="w-5 h-5" />
            </button>
          </div>
        )) : (
            <div className="text-center py-10">
                <p className="text-slate-400">No materials yet. Add one above to start your list.</p>
            </div>
        )}
      </div>

      <footer className="mt-auto pt-6 border-t-2 border-slate-800 flex justify-between items-center">
        <span className="text-xl font-semibold text-slate-300">Total Estimated Cost</span>
        <span className="text-3xl font-bold text-sky-400">{country.symbol}{totalCost.toFixed(2)}</span>
      </footer>
    </div>
  );
};

export default ShoppingListPage;
