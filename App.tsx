import React, { useState, useEffect, useCallback } from 'react';
import { ShoppingList, UserSettings } from './types';
import ListPage from './components/ListPage';
import ShoppingListPage from './components/ShoppingListPage';
import LoginPage from './components/LoginPage';
import { auth, db } from './firebase';
import { getDefaultStatuses } from './utils/defaults';

// This tells TypeScript that a 'firebase' object exists in the global scope
declare const firebase: any;

const App: React.FC = () => {
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [lists, setLists] = useState<ShoppingList[]>([]);
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null);


  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setLoading(false);
        setUserSettings(null); // Clear settings on logout
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      // Fetch user settings
      const settingsDocRef = db.collection('settings').doc(user.uid);
      const unsubscribeSettings = settingsDocRef.onSnapshot(async (doc) => {
        if (doc.exists) {
          setUserSettings(doc.data() as UserSettings);
        } else {
          // No settings found, create defaults
          const defaultSettings = { statuses: getDefaultStatuses() };
          await settingsDocRef.set(defaultSettings);
          setUserSettings(defaultSettings);
        }
        setLoading(false); // Move loading state change here
      });

      // Fetch lists
      const q = db.collection('lists')
        .where('uid', '==', user.uid);

      const unsubscribeLists = q.onSnapshot((querySnapshot) => {
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
      return () => {
        unsubscribeSettings();
        unsubscribeLists();
      };
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

  const updateUserSettings = useCallback(async (newSettings: UserSettings) => {
    if (!user) return;
    try {
      await db.collection('settings').doc(user.uid).set(newSettings);
    } catch (error) {
      console.error("Error updating settings: ", error);
    }
  }, [user]);

  const handleSignOut = async () => {
    try {
      await auth.signOut();
    } catch (error) {
      console.error("Error signing out: ", error);
    }
  };

  const selectedList = lists.find(list => list.id === selectedListId);

  if (loading || (user && !userSettings)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-2xl text-pencil-light">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen font-sans">
      {!user ? (
        <LoginPage />
      ) : selectedList && userSettings ? (
        <ShoppingListPage 
          list={selectedList} 
          onBack={() => setSelectedListId(null)}
          onUpdateList={updateList}
          userSettings={userSettings}
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
          userSettings={userSettings}
          onUpdateUserSettings={updateUserSettings}
        />
      )}
    </div>
  );
};

export default App;