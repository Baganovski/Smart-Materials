import { GoogleGenAI, Type } from '@google/genai';
import { ShoppingListItem } from '../types';

// The API key is injected by the environment, so we can assume process.env.API_KEY is available.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

const suggestionSchema = {
    type: Type.OBJECT,
    properties: {
        suggestions: {
            type: Type.ARRAY,
            items: {
                type: Type.STRING,
                description: 'A single suggested item for the shopping list.',
            },
            description: 'An array of suggested items.',
        },
    },
    required: ['suggestions'],
};

export const suggestItems = async (listName: string, existingItems: ShoppingListItem[]): Promise<string[]> => {
    const existingItemsString = existingItems.map(item => `- ${item.name}`).join('\n');

    const prompt = `
        You are a helpful assistant for creating shopping lists.
        A user has a list named "${listName}".
        The list already contains the following items:
        ${existingItemsString.length > 0 ? existingItemsString : '(The list is currently empty)'}

        Based on the list title and its current items, suggest up to 5 new, unique, and relevant items.
        Do not suggest items that are already on the list.
        Do not include quantities or any other details, just the item names.
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: suggestionSchema,
            },
        });

        const text = response.text.trim();
        const json = JSON.parse(text);

        if (json.suggestions && Array.isArray(json.suggestions)) {
            // Filter out any suggestions that might already be on the list (case-insensitive)
            const existingItemNamesLower = new Set(existingItems.map(i => i.name.toLowerCase()));
            const newSuggestions = json.suggestions.filter((s: any) =>
                typeof s === 'string' &&
                s.trim() !== '' &&
                !existingItemNamesLower.has(s.toLowerCase())
            );
            return newSuggestions;
        }
        // If the response is not as expected, return an empty array
        return [];
    } catch (error) {
        console.error('Error calling Gemini API:', error);
        // Re-throw a more user-friendly error to be caught by the component
        throw new Error('Failed to get suggestions from the API.');
    }
};
