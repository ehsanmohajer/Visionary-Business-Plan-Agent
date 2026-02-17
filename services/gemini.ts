
import { GoogleGenAI } from "@google/genai";
import { BusinessFormData, Language, SubscriptionTier } from "../types";

export const generateBusinessPlan = async (data: BusinessFormData, lang: Language, tier: SubscriptionTier): Promise<string> => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing VITE_GEMINI_API_KEY");
  }
  const ai = new GoogleGenAI({ apiKey });
  
  const isAdvanced = tier === 'pro';
  
  const prompt = `
    Create a professional, detailed, and structured business plan in ${lang === Language.EN ? 'English' : 'Finnish'} based on the following data:
    
    Company Name: ${data.companyName}
    Business Type: ${data.businessType}
    Product/Service: ${data.description}
    Value Proposition: ${data.uniqueness}
    Target Audience: ${data.targetAudience}
    
    Market Context:
    - Competitors: ${data.competitors}
    - Differentiators: ${data.competitorDifferentiator}
    - Trends: ${data.marketTrends}
    
    Business Model:
    - Revenue Streams: ${data.revenueStreams}
    - Resources: ${data.resources}
    - Delivery: ${data.deliveryProcess}
    
    Marketing:
    - Reach Strategy: ${data.customerReach}
    - Channels: ${data.marketingChannels}
    - Brand Image: ${data.brandImage}
    
    Financial Summary:
    - Revenue Goal: ${data.revenueGoal}€/year
    - Major Startup Costs: ${data.startupCosts.map(i => `${i.name}: ${i.amount}€`).join(', ')}
    - Monthly Fixed Costs: ${data.fixedCosts.map(i => `${i.name}: ${i.amount}€`).join(', ')}
    - Monthly Variable Costs: ${data.variableCosts.map(i => `${i.name}: ${i.amount}€`).join(', ')}
    
    Risks:
    - Risks: ${data.risks}
    - Mitigation: ${data.mitigation}

    ${isAdvanced ? 'This is a PRO generation. Provide extreme detail, deep competitive analysis, 5-year outlook, and specific strategic recommendations based on current market trends.' : 'Format the output using professional Markdown.'}
    Include sections for Executive Summary, Company Overview, Market Analysis, Operations, Marketing Strategy, Financial Plan (including a brief analysis of break-even and profitability based on the numbers), and Risk Management.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
    });
    // Access the .text property directly instead of calling it as a method.
    return response.text || "Failed to generate plan.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw new Error("Failed to communicate with the AI agent.");
  }
};
