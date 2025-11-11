import { GoogleGenAI } from "@google/genai";
import { Country, ProductSuggestion } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

const parseJsonFromMarkdown = (markdown: string): {suggestions: ProductSuggestion[]} | null => {
  const match = markdown.match(/```json\s*([\s\S]*?)\s*```/);
  if (match && match[1]) {
    try {
      return JSON.parse(match[1]);
    } catch (e) {
      console.error("Failed to parse JSON from markdown", e);
      return null;
    }
  }
  // Fallback for cases where the model doesn't use markdown
  try {
    return JSON.parse(markdown);
  } catch(e) {
    // not a raw json string
  }
  return null;
};

export const fetchProductSuggestions = async (
  itemName: string,
  quantity: number,
  country: Country,
  sources?: string
): Promise<ProductSuggestion[] | 'error'> => {
  const model = 'gemini-2.5-flash';
  
  const prompt = `You are an expert materials cost estimator for tradespeople operating in ${country.name}.
Your task is to find up to 5 specific, purchasable products matching the user's query and return them in a structured JSON format.

**Search Details:**
*   **Country:** ${country.name}
*   **Currency:** ${country.currency}
*   **Query:** "${itemName}"
*   **Quantity:** ${quantity}
*   **Preferred Suppliers:** ${sources && sources.trim() ? sources : 'Search major, reputable suppliers for tradespeople.'}

**Instructions:**
1.  Find matching products from online suppliers. Prioritize preferred suppliers if listed.
2.  For each product, calculate the total price for the required quantity (${quantity}). This should be the final price in ${country.currency}.
3.  Also provide the effective price for a single unit.
4.  You MUST provide a direct URL to the product page for each suggestion.

**Output Format:**
Respond ONLY with a valid JSON object. Do not include any other text, explanations, or markdown formatting. The JSON structure is:
{
  "suggestions": [
    {
      "name": "<Full Product Name>",
      "supplier": "<Supplier Name>",
      "pricePerUnit": <number>,
      "totalPrice": <number>,
      "productUrl": "<Direct product URL>"
    }
  ]
}

If no products are found, return: {"suggestions": []}.`;

  try {
    const response = await ai.models.generateContent({
        model: model,
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
        },
    });

    const jsonString = response.text.trim();
    if (jsonString) {
      const result = parseJsonFromMarkdown(jsonString);
      if (result && Array.isArray(result.suggestions)) {
        return result.suggestions;
      }
    }
    console.error("Failed to get valid suggestions from API response:", jsonString);
    return 'error';
  } catch (error) {
    console.error(`Error fetching suggestions for ${itemName}:`, error);
    return 'error';
  }
};