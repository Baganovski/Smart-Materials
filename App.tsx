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


  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      if (currentUser) {
        // Reload user data from Firebase to get the latest emailVerified status
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
          // If reload fails (e.g., user deleted), sign them out
          auth.signOut();
        }).finally(() => {
          setLoading(false);
        });
      } else {
        setUser(null);
        setNeedsVerification(false);
        setLoading(false);
        setUserSettings(null); // Clear settings on logout
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (user && !needsVerification) {
      setLoading(true);
      // Fetch user settings
      const settingsDocRef = db.collection('settings').doc(user.uid);
      const unsubscribeSettings = settingsDocRef.onSnapshot(async (doc) => {
        if (doc.exists) {
          const data = doc.data();
          // Migration for old users who have `statuses` instead of `statusGroups`
          if (data && data.statuses && !data.statusGroups) {
            const migratedSettings: UserSettings = {
              statusGroups: [{
                id: 'default',
                name: 'My Workflow',
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
    } else {
      setLists([]);
      if (!user) { // If user is null, ensure settings are cleared
        setUserSettings(null);
      }
    }
  }, [user, needsVerification]);

  const addList = async (name: string) => {
    if (!user || !userSettings) return;
    try {
      // Assign the first status group by default
      const defaultStatusGroupId = userSettings.statusGroups[0]?.id || 'default';
      await db.collection('lists').add({
        uid: user.uid,
        name,
        items: [],
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        statusGroupId: defaultStatusGroupId,
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

  if (loading || (user && !needsVerification && !userSettings)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-2xl text-pencil-light">Loading...</p>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }
  
  if (needsVerification) {
    return <VerifyEmailPage user={user} />;
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
        />
      )}
    </div>
  );
};

export default App;
