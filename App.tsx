import React, { useState, useCallback } from 'react';
import { ShoppingList, Country } from './types';
import useLocalStorage from './hooks/useLocalStorage';
import ListPage from './components/ListPage';
import ShoppingListPage from './components/ShoppingListPage';
import { defaultCountry } from './utils/countries';

const App: React.FC = () => {
  const [lists, setLists] = useLocalStorage<ShoppingList[]>('shoppingLists', []);
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [country, setCountry] = useLocalStorage<Country>('userCountry', defaultCountry);
  
  const addList = (name: string) => {
    const newList: ShoppingList = {
      id: Date.now().toString(),
      name,
      items: [],
      createdAt: new Date().toISOString(),
    };
    setLists(prevLists => [...prevLists, newList]);
  };

  const deleteList = (id: string) => {
    setLists(prevLists => prevLists.filter(list => list.id !== id));
  };
  
  const updateList = useCallback((updatedList: ShoppingList) => {
    setLists(prevLists => 
      prevLists.map(list => list.id === updatedList.id ? updatedList : list)
    );
  }, [setLists]);

  const selectedList = lists.find(list => list.id === selectedListId);

  return (
    <div className="min-h-screen font-sans">
       {selectedList ? (
        <ShoppingListPage 
          list={selectedList} 
          onBack={() => setSelectedListId(null)}
          onUpdateList={updateList}
          country={country}
        />
      ) : (
        <ListPage 
          lists={lists} 
          onAddList={addList} 
          onDeleteList={deleteList}
          onSelectList={setSelectedListId}
          country={country}
          onCountryChange={setCountry}
        />
      )}
    </div>
  );
};

export default App;
