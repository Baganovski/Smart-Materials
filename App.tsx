
import React, { useState, useEffect, useCallback } from 'react';
import { ShoppingList, UserSettings, StatusGroup } from './types';
import ListPage from './components/ListPage';
import ShoppingListPage from './components/ShoppingListPage';
import LoginPage from './components/LoginPage';
import VerifyEmailPage from './components/VerifyEmailPage';
// Fix: Import 'firebase' directly to avoid using a global declaration and potential scope conflicts.
import { auth, db, firebase } from './firebase';
import { getDefaultStatusGroups, NOTE_COLORS } from './utils/defaults';
import ArrowPathIcon from './components/icons/ArrowPathIcon';
import TrashIcon from './components/icons/TrashIcon';
import XMarkIcon from './components/icons/XMarkIcon';
import SlidersIcon from './components/icons/SlidersIcon';

// Helper for deep comparison to avoid merging identical templates
const isDeepEqual = (obj1: any, obj2: any): boolean => {
  if (obj1 === obj2) return true;
  if (typeof obj1 !== 'object' || obj1 === null || typeof obj2 !== 'object' || obj2 === null) return false;
  
  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);
  
  if (keys1.length !== keys2.length) return false;
  
  for (const key of keys1) {
    if (!keys2.includes(key) || !isDeepEqual(obj1[key], obj2[key])) return false;
  }
  
  return true;
};

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
  const [pendingLocalSettings, setPendingLocalSettings] = useState<UserSettings | null>(null);

  // Helper to migrate guest lists and settings to the authenticated account
  const migrateGuestData = async (uid: string) => {
    const localListsStr = localStorage.getItem('guest_lists');
    const localSettingsStr = localStorage.getItem('guest_settings');
    
    let groupIdMap: Record<string, string> = {};

    try {
      // 1. Migrate Settings first to handle Template IDs
      if (localSettingsStr) {
        const localSettings: UserSettings = JSON.parse(localSettingsStr);
        
        // Only migrate if there are actual status groups
        if (localSettings.statusGroups && localSettings.statusGroups.length > 0) {
            const settingsRef = db.collection('settings').doc(uid);
            const doc = await settingsRef.get();
            
            // Get current cloud settings or defaults
            let currentSettings: UserSettings = doc.exists 
                ? (doc.data() as UserSettings) 
                : { statusGroups: getDefaultStatusGroups() };
            
            // If current settings is empty/malformed for some reason, force defaults
            if (!currentSettings.statusGroups) currentSettings.statusGroups = getDefaultStatusGroups();

            let newGroups = [...currentSettings.statusGroups];
            let settingsChanged = false;

            localSettings.statusGroups.forEach((guestGroup) => {
                const conflictIndex = newGroups.findIndex(g => g.id === guestGroup.id);
                
                if (conflictIndex > -1) {
                    const cloudGroup = newGroups[conflictIndex];
                    
                    // Use deep equality check instead of JSON.stringify for reliability
                    if (!isDeepEqual(cloudGroup, guestGroup)) {
                        // Content is different. 
                        
                        // CHECK: Is the cloud version just a standard unmodified default?
                        // If so, we should overwrite it with the guest version (which might be an older default or a custom one)
                        // rather than creating a duplicate "Merged" entry.
                        const defaultGroups = getDefaultStatusGroups();
                        const defaultVersion = defaultGroups.find(g => g.id === cloudGroup.id);
                        const isCloudStandard = defaultVersion && isDeepEqual(cloudGroup, defaultVersion);

                        if (isCloudStandard) {
                             // Cloud is standard/default. We can safely overwrite it with the guest version.
                             newGroups[conflictIndex] = guestGroup;
                             settingsChanged = true;
                        } else {
                            // Cloud is custom/different AND Guest is different. 
                            // We must save the guest one, but rename/re-ID it to avoid losing cloud data.
                            const newId = `${guestGroup.id}_merged_${Date.now()}`;
                            groupIdMap[guestGroup.id] = newId; // Map old guest ID to new Cloud ID
                            
                            newGroups.push({
                                ...guestGroup,
                                id: newId,
                                name: `${guestGroup.name} (Merged)`
                            });
                            settingsChanged = true;
                        }
                    } else {
                        // Content is identical. No action needed.
                    }
                } else {
                    // No ID conflict, just add the group
                    newGroups.push(guestGroup);
                    settingsChanged = true;
                }
            });

            if (settingsChanged) {
                await settingsRef.set({ statusGroups: newGroups });
                console.log('Merged guest templates into account.');
            }
        }
      }

      // 2. Migrate Lists
      if (localListsStr) {
        const localLists: ShoppingList[] = JSON.parse(localListsStr);
        if (localLists.length > 0) {
            console.log(`Migrating ${localLists.length} lists for user ${uid}...`);
            const batch = db.batch();
            
            localLists.forEach((list) => {
                const newDocRef = db.collection('lists').doc();
                
                // Check if the list's statusGroupId needs to be remapped (because we renamed a conflicting template)
                const finalStatusGroupId = groupIdMap[list.statusGroupId] || list.statusGroupId || 'default';

                const listData = {
                    ...list,
                    id: newDocRef.id,
                    uid: uid,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    items: list.items || [],
                    statusGroupId: finalStatusGroupId,
                    color: list.color || NOTE_COLORS[0], // Ensure color is migrated
                };
                batch.set(newDocRef, listData);
            });

            await batch.commit();
        }
      }
      
      // Clear guest data
      localStorage.removeItem('guest_lists');
      localStorage.removeItem('guest_settings');
      console.log('Migration successful, local guest data cleared.');

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
  
  // Abstracted logic to check for guest data and either trigger migration or finalize login
  const handlePostLogin = useCallback(async (currentUser: any) => {
    // Check for Lists
    const localListsStr = localStorage.getItem('guest_lists');
    let hasGuestLists = false;
    let localLists: ShoppingList[] = [];
    if (localListsStr) {
            try {
            localLists = JSON.parse(localListsStr);
            if (localLists.length > 0) hasGuestLists = true;
            } catch (e) {
            console.error("Error parsing local lists", e);
            }
    }

    // Check for Settings/Templates
    const localSettingsStr = localStorage.getItem('guest_settings');
    let hasGuestSettings = false;
    let localSettings: UserSettings | null = null;
    if (localSettingsStr) {
        try {
            const parsed = JSON.parse(localSettingsStr);
            // Check if they actually differ from defaults (simple check: do they have groups?)
            if (parsed.statusGroups && parsed.statusGroups.length > 0) {
                localSettings = parsed;
                // Ideally we'd check if it's just the default, but for now, if it exists in LS, we assume it might be custom
                hasGuestSettings = true;
            }
        } catch(e) {
            console.error("Error parsing local settings", e);
        }
    }

    if (hasGuestLists || hasGuestSettings) {
        // Pause login and ask user what to do
        setPendingLocalLists(localLists);
        setPendingLocalSettings(localSettings);
        setPendingMigrationUser(currentUser);
        setLoading(false); 
    } else {
        // No guest data, proceed immediately
        await finalizeLogin(currentUser);
    }
  }, [finalizeLogin]);

  // New function to check verification without reloading the page
  const handleCheckVerification = async () => {
      if (!user) return;
      try {
          await user.reload();
          const freshUser = auth.currentUser;
          if (freshUser && freshUser.emailVerified) {
              setNeedsVerification(false);
              await handlePostLogin(freshUser);
          } else {
              throw new Error("Not verified");
          }
      } catch (e) {
          throw e;
      }
  };

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
        setShowLogin(false);

        await handlePostLogin(currentUser);

      } else {
        // User is signed out
        setUser(null);
        setNeedsVerification(false);
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, [handlePostLogin]);

  const handleMergeData = async () => {
    if (!pendingMigrationUser) return;
    setLoading(true);
    await migrateGuestData(pendingMigrationUser.uid);
    await finalizeLogin(pendingMigrationUser);
    setPendingMigrationUser(null);
    setPendingLocalLists([]);
    setPendingLocalSettings(null);
  };

  const handleDiscardData = async () => {
    if (!pendingMigrationUser) return;
    setLoading(true);
    localStorage.removeItem('guest_lists');
    localStorage.removeItem('guest_settings');
    await finalizeLogin(pendingMigrationUser);
    setPendingMigrationUser(null);
    setPendingLocalLists([]);
    setPendingLocalSettings(null);
  };

  const handleCancelMigration = async () => {
    // User cancelled the migration flow, so sign them out to return to guest mode
    await auth.signOut();
    setPendingMigrationUser(null);
    setPendingLocalLists([]);
    setPendingLocalSettings(null);
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
            color: data.color || NOTE_COLORS[0], // Ensure color exists
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
        setLists(localLists.map((l: ShoppingList) => ({ ...l, color: l.color || NOTE_COLORS[0] })));

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
    const defaultColor = NOTE_COLORS[0];
    if (user && !needsVerification) {
      try {
        await db.collection('lists').add({
          uid: user.uid,
          name,
          items: [],
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          statusGroupId: statusGroupId,
          color: defaultColor,
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
        color: defaultColor,
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
    return <VerifyEmailPage user={user} onCheckVerification={handleCheckVerification} />;
  }

  // Modal for migrating guest data
  if (pendingMigrationUser) {
    const foundTemplatesCount = pendingLocalSettings?.statusGroups?.length || 0;
    const foundListsCount = pendingLocalLists.length;
    
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
                        <h2 className="text-2xl font-bold mb-2">Found Existing Data</h2>
                        <p className="text-pencil-light mb-3">
                            We found the following on this device:
                        </p>
                        <div className="bg-pencil/5 rounded-xl p-3 mb-4">
                            {foundListsCount > 0 && (
                                <div className="mb-2 last:mb-0">
                                    <p className="font-bold text-pencil flex items-center gap-2">
                                        <span className="bg-ink text-white text-xs px-2 py-0.5 rounded-full">{foundListsCount}</span> 
                                        List{foundListsCount !== 1 ? 's' : ''}
                                    </p>
                                    <ul className="list-disc list-inside ml-2 text-sm text-pencil-light mt-1">
                                        {pendingLocalLists.slice(0, 2).map(l => (
                                            <li key={l.id} className="truncate">{l.name}</li>
                                        ))}
                                        {foundListsCount > 2 && <li>and {foundListsCount - 2} more...</li>}
                                    </ul>
                                </div>
                            )}
                            
                            {foundTemplatesCount > 0 && (
                                <div className="mt-2 border-t border-pencil/10 pt-2">
                                    <p className="font-bold text-pencil flex items-center gap-2">
                                        <SlidersIcon className="w-4 h-4" />
                                        <span>Custom Styles</span>
                                    </p>
                                    <p className="text-xs text-pencil-light ml-6">
                                        Your custom list styles will be merged.
                                    </p>
                                </div>
                            )}
                        </div>
                        <p className="text-pencil-light text-sm">
                            Do you want to merge this data into your account or start fresh?
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
                            <span className="text-xs font-normal opacity-80">Save lists and templates to account</span>
                        </div>
                    </button>
                    <button 
                        onClick={handleDiscardData} 
                        className="w-full px-4 py-3 bg-transparent md:hover:bg-danger/10 border-2 border-pencil/30 md:hover:border-danger text-pencil md:hover:text-danger rounded-full transition-colors flex items-center justify-center gap-3 text-left"
                    >
                         <div className="flex-shrink-0"><TrashIcon className="w-6 h-6" /></div>
                         <div className="flex flex-col items-start">
                            <span>Discard Guest Data</span>
                            <span className="text-xs font-normal opacity-80">Delete local data and open account</span>
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
