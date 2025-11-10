// FIX: Define and export interfaces for ShoppingList, ShoppingListItem, and Country to resolve "not a module" errors across the application. This provides the necessary type definitions for the app's data structures.
export interface ShoppingListItem {
  id: string;
  name: string;
  quantity: number;
  unit: 'items' | 'meters';
  cost: number | 'loading' | 'error';
  completed: boolean;
}

export interface ShoppingList {
  id: string;
  name: string;
  items: ShoppingListItem[];
  createdAt: string;
}

export interface Country {
  name: string;
  code: string;
  currency: string;
  symbol: string;
}
