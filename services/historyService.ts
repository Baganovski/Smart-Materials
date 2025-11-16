import { db, firebase } from '../firebase';

const historyCollection = db.collection('history');

export const getHistory = async (userId: string): Promise<string[]> => {
    const docRef = historyCollection.doc(userId);
    const doc = await docRef.get();
    if (doc.exists) {
        return doc.data()?.items || [];
    }
    return [];
};

export const addHistoryItem = async (userId: string, itemName: string): Promise<void> => {
    if (!itemName) return;
    const docRef = historyCollection.doc(userId);
    // Use set with merge to create the doc if it doesn't exist
    await docRef.set({
        items: firebase.firestore.FieldValue.arrayUnion(itemName.toLowerCase())
    }, { merge: true });
};

export const removeHistoryItem = async (userId: string, itemName: string): Promise<void> => {
    if (!itemName) return;
    const docRef = historyCollection.doc(userId);
    await docRef.update({
        items: firebase.firestore.FieldValue.arrayRemove(itemName.toLowerCase())
    });
};
