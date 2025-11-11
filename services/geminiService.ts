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
  
  const systemInstruction = `You are an expert materials sourcing agent for tradespeople.
Your task is to find purchasable products that match the user's request.
You must respond ONLY with a valid JSON object inside a JSON markdown block.
The JSON object must conform to this structure:
{
  "suggestions": [
    {
      "name": "Full Product Name",
      "supplier": "Supplier Name",
      "pricePerUnit": 10.50,
      "totalPrice": 21.00,
      "productUrl": "https://example.com/product"
    }
  ]
}
If no products are found, return: {"suggestions": []}.
Do not include any other text or explanations.`;

  const userPrompt = `Please find up to 5 product suggestions based on these details:
- Search Query: "${itemName}"
- Quantity Required: ${quantity}
- Country for Suppliers: ${country.name}
- Currency for Pricing: ${country.currency}
- Preferred Suppliers (if any): ${sources && sources.trim() ? sources : 'Any reputable supplier.'}

For each suggestion, provide the full product name, the supplier, the price for a single unit, the total price for the specified quantity, and a direct URL to the product page.`;

  try {
    const response = await ai.models.generateContent({
        model: model,
        contents: userPrompt,
        config: {
          systemInstruction: systemInstruction,
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