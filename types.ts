// Fix: Define the firebase namespace and nested Timestamp type for TypeScript.
// This allows using firebase.firestore.Timestamp as a type.
declare global {
  namespace firebase {
    namespace firestore {
      interface Timestamp {
        toDate(): Date;
        toMillis(): number;
      }
      // A variable with the same name as the interface is declared to hold static members.
      var Timestamp: {
        fromMillis(milliseconds: number): Timestamp;
      };
    }
  }
}

export type ItemStatus = string;

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
  statusGroupId: string; // Link to a specific status group
}

export interface Country {
  name: string;
  code: string;
}

export interface CustomStatus {
  id: string;
  name: string;
  color: string;
  // Fix: Add missing 'icon' property to resolve type errors.
  icon: string;
}

export interface StatusGroup {
  id: string;
  name: string;
  statuses: CustomStatus[];
}

export interface UserSettings {
  statusGroups: StatusGroup[];
}