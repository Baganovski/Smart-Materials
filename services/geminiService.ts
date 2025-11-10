import { GoogleGenAI } from "@google/genai";
import { Country } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

const parseJsonFromMarkdown = (markdown: string): {cost: number | null} | null => {
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

export const fetchItemCost = async (
  itemName: string,
  quantity: number,
  unit: 'items' | 'meters',
  country: Country
): Promise<number | 'error'> => {
  const model = 'gemini-2.5-flash';
  
  const unitString = unit === 'items' ? (quantity > 1 ? 'items' : 'item') : 'meters';

  const prompt = `You are an expert materials cost estimator for tradespeople in ${country.name}. Your task is to find the precise, standard retail price for a specific building material, including any sales tax (like VAT in the UK).

**Job Details:**
*   **Country for Pricing:** ${country.name}
*   **Currency:** ${country.currency}
*   **Material to Price:** "${itemName}"
*   **Required Quantity:** ${quantity}
*   **Unit:** ${unitString}

**Critical Instructions:**
1.  **Prioritize Suppliers:** You MUST prioritize your search on major, reputable suppliers for tradespeople in ${country.name}. For the UK, focus on Screwfix, Toolstation, B&Q. For the US, focus on Home Depot, Lowe's. Find the price from one of these if possible.
2.  **VAT/Tax INCLUSIVE:** The final price you return MUST be the total price a customer would pay at checkout, including all relevant taxes (e.g., VAT).
3.  **BEWARE OF PACK SIZES:** This is the most common source of error. Many suppliers list a low "per item" price for a large pack. Your goal is to find the price for the **actual quantity requested**.
    *   If the user asks for a quantity of 1, find the price to buy a SINGLE item. Do NOT use the "per item" price from a multi-pack.
    *   If the user asks for a quantity greater than 1, calculate the total cost for that many individual items, or find the most cost-effective combination of packs to meet that quantity.
4.  **Handle Ambiguity:** If the material name itself contains a quantity (e.g., "50m cable"), you MUST IGNORE it. Base your calculation ONLY on the provided "Required Quantity" and "Unit".
5.  **Final Output Format:** You MUST respond ONLY with a single JSON object. Do not add any other text or explanations. The format must be: \`{"cost": <total_price_as_a_number_including_tax>}\`
6.  **If No Price Found:** If you cannot find a confident price from a reputable supplier that matches these criteria, respond with: \`{"cost": null}\``;

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
      if (result && typeof result.cost === 'number') {
        return result.cost;
      }
    }
    return 'error';
  } catch (error) {
    console.error(`Error fetching cost for ${itemName}:`, error);
    return 'error';
  }
};