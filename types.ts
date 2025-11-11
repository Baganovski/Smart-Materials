// FIX: Removed self-import of 'Country' which conflicted with its local declaration.
export interface ProductSuggestion {
  name: string;
  supplier: string;
  pricePerUnit: number;
  totalPrice: number;
  productUrl: string;
}

export interface ShoppingListItem {
  id: string;
  name: string;
  quantity: number;
  cost: number | 'searching' | 'select' | 'error' | null;
  suggestions?: ProductSuggestion[];
  completed: boolean;
  productUrl?: string;
}

export interface ShoppingList {
  id: string;
  name: string;
  items: ShoppingListItem[];
  createdAt: string;
  sources?: string;
}

export interface Country {
  name: string;
  code: string;
  currency: string;
  symbol: string;
}
