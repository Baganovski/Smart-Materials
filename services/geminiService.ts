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
  
  const supplierInstructions = sources && sources.trim() ? 
`**Supplier Search Strategy (Strict Priority):**
You have been given a priority list of suppliers: **${sources}**. Some trade websites can be difficult to search, so follow this process carefully:

1.  **Iterate and Search:** For EACH supplier in the priority list, you MUST perform the following search steps:
    a. **Direct Site Search:** First, attempt a targeted search directly on the supplier's website. For example, if a supplier is 'cef.co.uk', your search query should be similar to \`site:cef.co.uk "${itemName}"\`. This is the most important step.
    b. **General Web Search:** If the direct site search yields no results, perform a broader web search like \`"${itemName}" at "CEF"\`.

2.  **Gather Results:** Collect all matching products you find from the priority suppliers. It is crucial to try this for every supplier listed.

3.  **Intelligent Fallback:** ONLY if you have diligently followed the steps above for ALL priority suppliers and have found ZERO matching products, you may then fall back to searching other major, reputable suppliers in ${country.name}. If you find results from even one priority supplier, do NOT use the fallback.`
:
`**Supplier Search:** You MUST search major, reputable suppliers for tradespeople in ${country.name}. For the UK, focus on Screwfix, Toolstation, B&Q. For the US, focus on Home Depot, Lowe's.
`;


  const prompt = `You are an expert materials cost estimator for tradespeople in ${country.name}. Your task is to find specific, purchasable products from online suppliers that match a user's query.

**Job Details:**
*   **Country for Pricing:** ${country.name}
*   **Currency:** ${country.currency}
*   **Material Search Query:** "${itemName}"
*   **Required Quantity:** ${quantity}

${supplierInstructions}

**Critical Instructions:**
1.  **Search for Products & Diversify:** Your primary goal is to find up to 5 specific, matching products. To provide a good price comparison, you **MUST** try to source these products from **at least three different suppliers** if possible.
    *   Follow the **Supplier Search Strategy** above to find matching products.
    *   Collect results from as many of the prioritized suppliers as possible.
    *   If you don't have results from at least three different suppliers after checking the priority list, use the fallback search to find more options from other major suppliers until you have a diverse set.
2.  **Identify Supplier & URL:** For each product, you MUST find:
    *   The name of the supplier (e.g., "Screwfix", "Home Depot").
    *   The direct URL to the product page.
3.  **Calculate Prices:** For each product you find:
    *   **Total Price:** Calculate the total cost for the **entire required quantity (${quantity})**. This calculation MUST account for pack sizes to find the most economical way to purchase the total quantity. The final price MUST include any sales tax (like VAT).
    *   **Unit Price:** Determine the effective price for a *single item/unit*. This might be derived from the pack price.
4.  **Final Output Format:** You MUST respond ONLY with a single JSON object inside a markdown block. Do not add any other text or explanations. The format must be:
    \`\`\`json
    {
      "suggestions": [
        {
          "name": "<Full Product Name, including brand and specifications>",
          "supplier": "<Name of the supplier, e.g., 'Screwfix'>",
          "pricePerUnit": <price_for_a_single_unit_as_a_number>,
          "totalPrice": <total_cost_for_quantity_as_a_number>,
          "productUrl": "<Direct link to the product page>"
        }
      ]
    }
    \`\`\`
5.  **If No Products Found:** If you cannot find any matching products, respond with an empty suggestions array: \`{"suggestions": []}\`.`;

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