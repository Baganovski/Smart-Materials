import React, { useState, useEffect, useCallback } from 'react';
import { ShoppingList, UserSettings } from './types';
import ListPage from './components/ListPage';
import ShoppingListPage from './components/ShoppingListPage';
import LoginPage from './components/LoginPage';
import VerifyEmailPage from './components/VerifyEmailPage';
// Fix: Import 'firebase' directly to avoid using a global declaration and potential scope conflicts.
import { auth, db, firebase } from './firebase';
import { getDefaultStatusGroups } from './utils/defaults';

const App: React.FC = () => {
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [lists, setLists] = useState<ShoppingList[]>([]);
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null);
  const [showLogin, setShowLogin] = useState(false);

  // Helper to migrate guest lists to the authenticated account
  const migrateGuestData = async (uid: string) => {
    const localListsStr = localStorage.getItem('guest_lists');
    if (!localListsStr) return;

    try {
      const localLists: ShoppingList[] = JSON.parse(localListsStr);
      if (localLists.length === 0) return;

      console.log(`Migrating ${localLists.length} lists for user ${uid}...`);

      const batch = db.batch();
      
      localLists.forEach((list) => {
        // Create a new document reference
        const newDocRef = db.collection('lists').doc();
        
        // Prepare the data, ensuring the UID is updated to the logged-in user
        // and timestamps are converted to server timestamps
        const listData = {
          ...list,
          id: newDocRef.id, // Use the new Firestore ID
          uid: uid,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          // Ensure items and statusGroupId exist
          items: list.items || [],
          statusGroupId: list.statusGroupId || 'default',
        };

        batch.set(newDocRef, listData);
      });

      await batch.commit();
      
      // Clear guest lists after successful migration
      localStorage.removeItem('guest_lists');
      console.log('Migration successful, local guest lists cleared.');
    } catch (error) {
      console.error("Error migrating guest data:", error);
    }
  };

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      if (currentUser) {
        // User just signed in
        setShowLogin(false);

        // 1. Attempt migration of any existing guest data
        await migrateGuestData(currentUser.uid);
        
        // 2. Reload user data to check verification status
        currentUser.reload().then(() => {
          const freshUser = auth.currentUser;
          if (freshUser && !freshUser.emailVerified) {
            setUser(freshUser);
            setNeedsVerification(true);
          } else {
            setUser(freshUser);
            setNeedsVerification(false);
          }
        }).catch(() => {
          auth.signOut();
        }).finally(() => {
          setLoading(false);
        });
      } else {
        // User is signed out
        setUser(null);
        setNeedsVerification(false);
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (user && !needsVerification) {
      setLoading(true);
      // --- AUTHENTICATED MODE: Fetch from Firestore ---
      const settingsDocRef = db.collection('settings').doc(user.uid);
      const unsubscribeSettings = settingsDocRef.onSnapshot(async (doc) => {
        if (doc.exists) {
          const data = doc.data();
          // Migration for old users who have `statuses` instead of `statusGroups`
          if (data && data.statuses && !data.statusGroups) {
            const migratedSettings: UserSettings = {
              statusGroups: [{
                id: 'default',
                name: 'My Template',
                statuses: data.statuses,
              }]
            };
            await settingsDocRef.set(migratedSettings);
            setUserSettings(migratedSettings);
          } else {
            setUserSettings(data as UserSettings);
          }
        } else {
          // No settings found, create defaults
          const defaultSettings: UserSettings = { statusGroups: getDefaultStatusGroups() };
          await settingsDocRef.set(defaultSettings);
          setUserSettings(defaultSettings);
        }
        setLoading(false);
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
            statusGroupId: data.statusGroupId || 'default', // Ensure statusGroupId exists
          } as ShoppingList;
        });
        setLists(listsData);
      });
      return () => {
        unsubscribeSettings();
        unsubscribeLists();
      };
    } else if (!user) {
      // --- GUEST MODE: Fetch from LocalStorage ---
      try {
        const localListsStr = localStorage.getItem('guest_lists');
        const localLists = localListsStr ? JSON.parse(localListsStr) : [];
        setLists(localLists);

        const localSettingsStr = localStorage.getItem('guest_settings');
        if (localSettingsStr) {
          setUserSettings(JSON.parse(localSettingsStr));
        } else {
          setUserSettings({ statusGroups: getDefaultStatusGroups() });
        }
      } catch (e) {
        console.error("Error loading guest data", e);
        setLists([]);
        setUserSettings({ statusGroups: getDefaultStatusGroups() });
      }
      setLoading(false);
    }
  }, [user, needsVerification]);

  const addList = async (name: string, statusGroupId: string) => {
    if (user) {
      try {
        await db.collection('lists').add({
          uid: user.uid,
          name,
          items: [],
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          statusGroupId: statusGroupId,
        });
      } catch (error) {
        console.error("Error adding document: ", error);
      }
    } else {
      // Guest Mode
      const newList: ShoppingList = {
        id: Date.now().toString(),
        uid: 'guest',
        name,
        items: [],
        createdAt: new Date().toISOString(),
        statusGroupId,
      };
      const updatedLists = [newList, ...lists];
      setLists(updatedLists);
      localStorage.setItem('guest_lists', JSON.stringify(updatedLists));
    }
  };

  const deleteList = async (id: string) => {
    if (user) {
      try {
        await db.collection('lists').doc(id).delete();
      } catch (error) {
        console.error("Error deleting document: ", error);
      }
    } else {
      // Guest Mode
      const updatedLists = lists.filter(l => l.id !== id);
      setLists(updatedLists);
      localStorage.setItem('guest_lists', JSON.stringify(updatedLists));
    }
  };
  
  const updateList = useCallback(async (updatedList: ShoppingList) => {
    if (user) {
      const { id, ...listData } = updatedList;
      try {
        await db.collection('lists').doc(id).update(listData);
      } catch (error) {
        console.error("Error updating document: ", error);
      }
    } else {
      // Guest Mode
      const updatedLists = lists.map(l => l.id === updatedList.id ? updatedList : l);
      setLists(updatedLists);
      localStorage.setItem('guest_lists', JSON.stringify(updatedLists));
    }
  }, [user, lists]);

  const updateUserSettings = useCallback(async (newSettings: UserSettings) => {
    if (user) {
      try {
        await db.collection('settings').doc(user.uid).set(newSettings);
      } catch (error) {
        console.error("Error updating settings: ", error);
      }
    } else {
      // Guest Mode
      setUserSettings(newSettings);
      localStorage.setItem('guest_settings', JSON.stringify(newSettings));
    }
  }, [user]);

  const handleSignOut = async () => {
    try {
      await auth.signOut();
    } catch (error) {
      console.error("Error signing out: ", error);
    }
  };
  
  const handleDeleteAccount = async () => {
    if (!user) return;

    try {
      // 1. Get all lists for the user
      const listsQuery = db.collection('lists').where('uid', '==', user.uid);
      const listsSnapshot = await listsQuery.get();
      
      // 2. Create a batch to delete all lists
      const batch = db.batch();
      listsSnapshot.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      // 3. Add settings deletion to the batch
      const settingsRef = db.collection('settings').doc(user.uid);
      batch.delete(settingsRef);
      
      // 4. Commit the batch
      await batch.commit();
      
      // 5. Delete the user from Firebase Auth
      await user.delete();

    } catch (error: any) {
      console.error("Error deleting account:", error);
      if (error.code === 'auth/requires-recent-login') {
        alert("This is a sensitive action that requires a recent sign-in. Please sign out, sign back in, and then try deleting your account again.");
      } else {
        alert(`An error occurred while deleting your account: ${error.message}`);
      }
    }
  };

  const selectedList = lists.find(list => list.id === selectedListId);

  // Determine if we are still loading initial data for guest or user
  const isGuestLoading = !user && !userSettings;

  if (loading || (user && !needsVerification && !userSettings) || isGuestLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-2xl text-pencil-light">Loading...</p>
      </div>
    );
  }
  
  if (needsVerification) {
    return <VerifyEmailPage user={user} />;
  }

  if (showLogin) {
    return <LoginPage onClose={() => setShowLogin(false)} />;
  }

  return (
    <div className="min-h-screen font-sans">
      {selectedList && userSettings ? (
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
          onDeleteAccount={handleDeleteAccount}
          onSignIn={() => setShowLogin(true)}
        />
      )}
    </div>
  );
};

export default App;