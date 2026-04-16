import { GoogleGenerativeAI } from "@google/generative-ai";
import { AI_MODELS, AI_PROMPTS_TEMPLATE } from "../constants/ai.constant.js";
import { RESPONSE_MESSAGES } from "../constants/auth.constant.js";

export class GeminiService {
  genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);

  delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

  async signalBasic(message: string) {
    const prompt = AI_PROMPTS_TEMPLATE.concat("\n" + message);
    const basicModel = this.genAI.getGenerativeModel({
      model: AI_MODELS.GEMINI_BASIC,
      generationConfig: {
        responseMimeType: "application/json",
      },
    });

    let aiText = "";

    try {
      const result = await basicModel.generateContent([{ text: prompt }]);
      aiText = result.response.text();

      if (!aiText) {
        throw new Error(RESPONSE_MESSAGES.SOMETHING_WENT_WRONG);
      }

      return aiText;
    } catch (err: any) {
      if (err.status === 429) {
        // 429 is "Too Many Requests" - Rate limit hit, waiting 30 seconds...
        await this.delay(30000);

        const result = await basicModel.generateContent([{ text: prompt }]);
        aiText = result.response.text();

        if (!aiText) {
          throw new Error(RESPONSE_MESSAGES.SOMETHING_WENT_WRONG);
        }

        return aiText;
      }
      throw err;
    }
  }

  async signalPro(message: string) {
    const prompt = AI_PROMPTS_TEMPLATE.concat("\n" + message);
    const proModel = this.genAI.getGenerativeModel({
      model: AI_MODELS.GEMINI_PRO,
      generationConfig: {
        responseMimeType: "application/json",
      },
    });

    let aiText = "";

    try {
      const result = await proModel.generateContent([{ text: prompt }]);
      aiText = result.response.text();

      if (!aiText) {
        throw new Error(RESPONSE_MESSAGES.SOMETHING_WENT_WRONG);
      }

      return aiText;
    } catch (err: any) {
      if (err.status === 429) {
        // 429 is "Too Many Requests" - Rate limit hit, waiting 30 seconds...
        await this.delay(30000);

        const result = await proModel.generateContent([{ text: prompt }]);
        aiText = result.response.text();

        if (!aiText) {
          throw new Error(RESPONSE_MESSAGES.SOMETHING_WENT_WRONG);
        }

        return aiText;
      }
      throw err;
    }
  }
}
