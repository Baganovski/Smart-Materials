// Fix: Define the firebase namespace and nested Timestamp type for TypeScript.
// This allows using firebase.firestore.Timestamp as a type.
declare namespace firebase {
  namespace firestore {
    interface Timestamp {
      toDate(): Date;
    }
  }
}

// This tells TypeScript that a 'firebase' object exists in the global scope
declare const firebase: any;

export type ItemStatus = 'listed' | 'ordered' | 'collected' | 'returned';

export interface ShoppingListItem {
  id: string;
  name: string;
  quantity: number;
  status: ItemStatus;
}

export interface ShoppingList {
  id: string;
  uid: string;
  name: string;
  items: ShoppingListItem[];
  createdAt: firebase.firestore.Timestamp | string;
}

export interface Country {
  name: string;
  code: string;
}
