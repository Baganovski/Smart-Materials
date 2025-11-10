import { Country } from '../types';

export const countries: Country[] = [
  { name: 'United States', code: 'US', currency: 'USD', symbol: '$' },
  { name: 'United Kingdom', code: 'GB', currency: 'GBP', symbol: '£' },
  { name: 'Canada', code: 'CA', currency: 'CAD', symbol: '$' },
  { name: 'Australia', code: 'AU', currency: 'AUD', symbol: '$' },
  { name: 'Germany', code: 'DE', currency: 'EUR', symbol: '€' },
  { name: 'France', code: 'FR', currency: 'EUR', symbol: '€' },
  { name: 'Japan', code: 'JP', currency: 'JPY', symbol: '¥' },
  { name: 'India', code: 'IN', currency: 'INR', symbol: '₹' },
  { name: 'Brazil', code: 'BR', currency: 'BRL', symbol: 'R$' },
  { name: 'Mexico', code: 'MX', currency: 'MXN', symbol: '$' },
];

export const defaultCountry = countries[1]; // United Kingdom