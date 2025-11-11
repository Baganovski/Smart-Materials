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
  sources?: string,
  existingSuggestions?: ProductSuggestion[]
): Promise<ProductSuggestion[] | 'error'> => {
  const model = 'gemini-2.5-flash';
  
  const systemInstruction = `You are an extremely accurate and reliable materials sourcing agent for tradespeople. Your primary goal is to find correct, purchasable products using Google Search and return them in a specific JSON format. Your reputation depends on the quality of your results.

**CRITICAL RULES:**
1.  **URL VALIDITY IS PARAMOUNT:** You MUST verify that every \`productUrl\` is a direct, working link to a specific product detail page. 
    -   **GOOD:** A URL like \`https://www.screwfix.com/p/product/12345\`
    -   **BAD:** Links to search result pages (e.g., \`.../search?q=...\`), category pages, homepages, or 404 error pages.
    -   If you cannot find a valid, direct product link, **OMIT THE PRODUCT ENTIRELY.** Do not guess.

2.  **PRICE ACCURACY:** You MUST find the most up-to-date price from the product page. If a price is not clearly visible, **OMIT THE PRODUCT.** Calculate \`totalPrice\` by multiplying \`pricePerUnit\` by the user-specified quantity.

3.  **SUPPLIER RELIABILITY:** Prioritize large, reputable national suppliers for the specified country. For the UK, this includes Screwfix, Toolstation, B&Q, Travis Perkins, and Wickes. These sites are more likely to yield reliable data.

4.  **NO GUESSING:** It is better to return fewer, high-quality results or even an empty \`suggestions\` array than to provide inaccurate or broken information. Never invent URLs or prices.

**RESPONSE FORMAT:**
You must respond ONLY with a valid JSON object inside a JSON markdown block.
The JSON object must conform to this structure:
{
  "suggestions": [
    {
      "name": "Full Product Name",
      "supplier": "Supplier Name",
      "pricePerUnit": 10.50,
      "totalPrice": 21.00,
      "productUrl": "https://valid-product-url.com/product-page"
    }
  ]
}

If no valid products are found that meet all the above criteria, return: {"suggestions": []}.
Do not include any other text, apologies, or explanations in your response.`;

  let exclusionPrompt = '';
  if (existingSuggestions && existingSuggestions.length > 0) {
      const exclusionList = existingSuggestions.map(s => `- ${s.name} from ${s.supplier}`).join('\n');
      exclusionPrompt = `\nIMPORTANT: The user has already seen the following products. Do NOT include them or any very similar products in your new response:\n${exclusionList}`;
  }

  const userPrompt = `Find up to 5 product suggestions based on these details:
- Search Query: "${itemName}"
- Quantity Required: ${quantity}
- Country for Suppliers: ${country.name}
- Currency for Pricing: ${country.currency}
- Preferred Suppliers (if any): ${sources && sources.trim() ? sources : 'Use your knowledge of reputable suppliers.'}
${exclusionPrompt}`;

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