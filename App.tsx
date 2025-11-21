
import React, { useState, useEffect, useCallback } from 'react';
import { ShoppingList, UserSettings } from './types';
import ListPage from './components/ListPage';
import ShoppingListPage from './components/ShoppingListPage';
import LoginPage from './components/LoginPage';
import VerifyEmailPage from './components/VerifyEmailPage';
// Fix: Import 'firebase' directly to avoid using a global declaration and potential scope conflicts.
import { auth, db, firebase } from './firebase';
import { getDefaultStatusGroups } from './utils/defaults';
import ArrowPathIcon from './components/icons/ArrowPathIcon';
import TrashIcon from './components/icons/TrashIcon';
import XMarkIcon from './components/icons/XMarkIcon';

const App: React.FC = () => {
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [lists, setLists] = useState<ShoppingList[]>([]);
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null);
  const [showLogin, setShowLogin] = useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);
  
  // State to handle the migration decision flow
  const [pendingMigrationUser, setPendingMigrationUser] = useState<any | null>(null);
  const [pendingLocalLists, setPendingLocalLists] = useState<ShoppingList[]>([]);

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
      localStorage.removeItem('guest_settings'); // Also clear settings if we merged
      console.log('Migration successful, local guest lists cleared.');
    } catch (error) {
      console.error("Error migrating guest data:", error);
    }
  };

  // Logic to finalize the login process after migration decision (or if no migration needed)
  const finalizeLogin = useCallback(async (currentUser: any) => {
    try {
        // Reload user to get latest claims
        await currentUser.reload();
        const freshUser = auth.currentUser || currentUser;
        setUser(freshUser);
    } catch (e) {
        console.error("Error reloading user", e);
        setUser(currentUser); // Fallback
    } finally {
        setLoading(false);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      if (currentUser) {
        // Check for email verification
        if (!currentUser.emailVerified) {
            setUser(currentUser);
            setNeedsVerification(true);
            setLoading(false);
            setShowLogin(false);
            return;
        }
        
        setNeedsVerification(false);
        // User just signed in and is verified
        setShowLogin(false);

        // Check if there is local data to migrate
        const localListsStr = localStorage.getItem('guest_lists');
        let hasGuestData = false;
        let localLists: ShoppingList[] = [];
        if (localListsStr) {
             try {
                localLists = JSON.parse(localListsStr);
                if (localLists.length > 0) hasGuestData = true;
             } catch (e) {
                console.error("Error parsing local lists", e);
             }
        }

        if (hasGuestData) {
            // Pause login and ask user what to do
            setPendingLocalLists(localLists);
            setPendingMigrationUser(currentUser);
            setLoading(false); // Stop loading so we can show the modal
        } else {
            // No guest data, proceed immediately
            await finalizeLogin(currentUser);
        }

      } else {
        // User is signed out
        setUser(null);
        setNeedsVerification(false);
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, [finalizeLogin]);

  const handleMergeData = async () => {
    if (!pendingMigrationUser) return;
    setLoading(true);
    await migrateGuestData(pendingMigrationUser.uid);
    await finalizeLogin(pendingMigrationUser);
    setPendingMigrationUser(null);
    setPendingLocalLists([]);
  };

  const handleDiscardData = async () => {
    if (!pendingMigrationUser) return;
    setLoading(true);
    localStorage.removeItem('guest_lists');
    localStorage.removeItem('guest_settings');
    await finalizeLogin(pendingMigrationUser);
    setPendingMigrationUser(null);
    setPendingLocalLists([]);
  };

  const handleCancelMigration = async () => {
    // User cancelled the migration flow, so sign them out to return to guest mode
    await auth.signOut();
    setPendingMigrationUser(null);
    setPendingLocalLists([]);
  };

  useEffect(() => {
    // Only fetch data if we have a user AND they are verified (or it's a guest)
    // If needsVerification is true, we stop here.
    if (needsVerification) return;

    if (user) {
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
    if (user && !needsVerification) {
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
    if (user && !needsVerification) {
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
    if (user && !needsVerification) {
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
  }, [user, lists, needsVerification]);

  const updateUserSettings = useCallback(async (newSettings: UserSettings) => {
    if (user && !needsVerification) {
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
  }, [user, needsVerification]);

  const handleSignOut = async () => {
    try {
      await auth.signOut();
      setNeedsVerification(false);
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
  const isGuestLoading = !user && !userSettings && !pendingMigrationUser;

  if (loading || (user && !needsVerification && !userSettings) || isGuestLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-2xl text-pencil-light">Loading...</p>
      </div>
    );
  }

  if (showLogin) {
    return <LoginPage onClose={() => setShowLogin(false)} />;
  }

  if (needsVerification && user) {
    return <VerifyEmailPage user={user} />;
  }

  // Modal for migrating guest data
  if (pendingMigrationUser) {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-pop-in p-4">
            <div className="bg-paper p-6 rounded-2xl border-2 border-pencil shadow-sketchy w-full max-w-md relative">
                 <button 
                    onClick={handleCancelMigration}
                    className="absolute top-4 right-4 p-1 text-pencil-light hover:text-pencil transition-colors"
                    aria-label="Cancel and sign out"
                >
                    <XMarkIcon className="w-8 h-8" />
                </button>

                <div className="flex items-start gap-4 mb-4">
                    <div className="flex-shrink-0 pt-1">
                        <ArrowPathIcon className="w-8 h-8 text-ink"/>
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold mb-2">Sync Guest Lists?</h2>
                        <p className="text-pencil-light mb-2">
                            We found {pendingLocalLists.length} list{pendingLocalLists.length === 1 ? '' : 's'} on this device:
                        </p>
                         <ul className="list-disc list-inside mb-4 text-sm text-pencil font-bold pl-2">
                            {pendingLocalLists.slice(0, 3).map(l => (
                                <li key={l.id} className="truncate">{l.name}</li>
                            ))}
                            {pendingLocalLists.length > 3 && <li>and {pendingLocalLists.length - 3} more...</li>}
                        </ul>
                        <p className="text-pencil-light text-sm">
                            What would you like to do with them?
                        </p>
                    </div>
                </div>
                <div className="flex flex-col gap-3">
                    <button 
                        onClick={handleMergeData} 
                        className="w-full px-4 py-3 bg-ink md:hover:bg-ink-light text-pencil font-bold rounded-full transition-colors flex items-center justify-center gap-3 text-left"
                    >
                         <div className="flex-shrink-0"><ArrowPathIcon className="w-6 h-6" /></div>
                         <div className="flex flex-col items-start">
                            <span>Merge into Account</span>
                            <span className="text-xs font-normal opacity-80">Keep these lists and add them to my account</span>
                        </div>
                    </button>
                    <button 
                        onClick={handleDiscardData} 
                        className="w-full px-4 py-3 bg-transparent md:hover:bg-danger/10 border-2 border-pencil/30 md:hover:border-danger text-pencil md:hover:text-danger rounded-full transition-colors flex items-center justify-center gap-3 text-left"
                    >
                         <div className="flex-shrink-0"><TrashIcon className="w-6 h-6" /></div>
                         <div className="flex flex-col items-start">
                            <span>Discard Guest Lists</span>
                            <span className="text-xs font-normal opacity-80">Delete these lists and open my account</span>
                        </div>
                    </button>
                </div>
            </div>
        </div>
    );
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
