import React, { useState, useEffect, useCallback } from 'react';
import { ShoppingList } from './types';
import ListPage from './components/ListPage';
import ShoppingListPage from './components/ShoppingListPage';
import LoginPage from './components/LoginPage';
import { auth, db } from './firebase';
import SpinnerIcon from './components/icons/SpinnerIcon';

// This tells TypeScript that a 'firebase' object exists in the global scope
declare const firebase: any;

const App: React.FC = () => {
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [lists, setLists] = useState<ShoppingList[]>([]);
  const [selectedListId, setSelectedListId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      const q = db.collection('lists')
        .where('uid', '==', user.uid);

      const unsubscribe = q.onSnapshot((querySnapshot) => {
        const listsData = querySnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            items: data.items || [], // Ensure items always exists
          } as ShoppingList;
        });
        setLists(listsData);
      });
      return () => unsubscribe();
    } else {
      setLists([]);
    }
  }, [user]);

  const addList = async (name: string) => {
    if (!user) return;
    try {
      await db.collection('lists').add({
        uid: user.uid,
        name,
        items: [],
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
    } catch (error) {
      console.error("Error adding document: ", error);
    }
  };

  const deleteList = async (id: string) => {
    try {
      await db.collection('lists').doc(id).delete();
    } catch (error) {
      console.error("Error deleting document: ", error);
    }
  };
  
  const updateList = useCallback(async (updatedList: ShoppingList) => {
    const { id, ...listData } = updatedList;
    try {
      await db.collection('lists').doc(id).update(listData);
    } catch (error) {
      console.error("Error updating document: ", error);
    }
  }, []);

  const handleSignOut = async () => {
    try {
      await auth.signOut();
    } catch (error) {
      console.error("Error signing out: ", error);
    }
  };

  const selectedList = lists.find(list => list.id === selectedListId);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <SpinnerIcon className="w-12 h-12" />
      </div>
    );
  }

  return (
    <div className="min-h-screen font-sans">
      {!user ? (
        <LoginPage />
      ) : selectedList ? (
        <ShoppingListPage 
          list={selectedList} 
          onBack={() => setSelectedListId(null)}
          onUpdateList={updateList}
        />
      ) : (
        <ListPage 
          lists={lists} 
          onAddList={addList} 
          onDeleteList={deleteList}
          onSelectList={setSelectedListId}
          onSignOut={handleSignOut}
          onUpdateList={updateList}
          user={user}
        />
      )}
    </div>
  );
};

export default App;