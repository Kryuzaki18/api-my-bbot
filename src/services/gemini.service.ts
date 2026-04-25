import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  AI_MODELS,
  AI_ANALYZE_MARKET_TEMPLATE,
  AI_CHAT_PROMPTS_TEMPLATE,
  AI_TRADE_BOT_TEMPLATE,
} from "../constants/ai.constant.js";
import { RESPONSE_MESSAGES } from "../constants/auth.constant.js";
import { BinanceService } from "./binance.service.js";
import Analyses, { type IAnalyses } from "../schema/analyses.schema.js";
import { AIType, type AIResponse } from "../models/ai.model.js";

export class GeminiService {
  binanceService = new BinanceService();
  genAI: GoogleGenerativeAI;

  delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

  constructor(private readonly geminiApiKey: string) {
    if (!geminiApiKey || !geminiApiKey.trim()) {
      throw Object.assign(new Error("GEMINI_API_KEY is missing."), { status: 500 });
    }
    this.genAI = new GoogleGenerativeAI(geminiApiKey);
  }

  async chat(message: string) {
    const prompt = AI_CHAT_PROMPTS_TEMPLATE.concat("\n" + message);
    const plan = 0;
    const basicModel = this.genAI.getGenerativeModel({
      model: !plan ? AI_MODELS.GEMINI_BASIC : AI_MODELS.GEMINI_PRO,
      generationConfig: {
        responseMimeType: "application/json",
      },
    });

    let aiText = "";

    try {
      const result = await basicModel.generateContent([{ text: prompt }]);
      const res = result.response.text();
      aiText = typeof res === "string" ? JSON.parse(res) : res;

      if (!aiText) {
        throw new Error(RESPONSE_MESSAGES.SOMETHING_WENT_WRONG);
      }

      return aiText;
    } catch (err: any) {
      if (err.status === 429) {
        // 429 is "Too Many Requests" - Rate limit hit, waiting 30 seconds...
        await this.delay(30000);

        const result = await basicModel.generateContent([{ text: prompt }]);
        const res = result.response.text();
        aiText = typeof res === "string" ? JSON.parse(res) : res;

        if (!aiText) {
          throw new Error(RESPONSE_MESSAGES.SOMETHING_WENT_WRONG);
        }

        return aiText;
      }
      throw err;
    }
  }

  async analyze(symbol: string, interval: string, type: AIType = AIType.GENERAL) {
    const klines = await this.binanceService.getKlines(symbol, interval);

    if (!klines) {
      return {
        status: "rejected",
        message: "Market data is missing or empty, cannot generate analysis.",
        response: null,
      } as AIResponse;
    }

    const template = type === AIType.GENERAL ? AI_ANALYZE_MARKET_TEMPLATE : AI_TRADE_BOT_TEMPLATE;

    const dataPrompt =
      `Here is the marketData for ${symbol} with timeframe ${interval}:` +
      `\n` +
      JSON.stringify(klines);
    const prompt = template.concat("\n" + dataPrompt);

    const aiModel = this.genAI.getGenerativeModel({
      model: AI_MODELS.GEMINI_BASIC,
      // model: deepAnalyze ? AI_MODELS.GEMINI_PRO : AI_MODELS.GEMINI_BASIC,
      generationConfig: {
        responseMimeType: "application/json",
      },
    });

    let aiText = "";

    try {
      const result = await aiModel.generateContent([{ text: prompt }]);
      const res = result.response.text();

      aiText = typeof res === "string" ? JSON.parse(res) : res;

      if (!aiText) {
        return {
          status: "rejected",
          message: "AI response is missing or empty, cannot generate analysis.",
          response: null,
        } as AIResponse;
      }

      await Analyses.create(aiText as unknown as IAnalyses);

      return aiText;
    } catch (err: any) {
      if (err.status === 429) {
        // 429 is "Too Many Requests" - Rate limit hit, waiting 30 seconds...
        await this.delay(30000);

        const result = await aiModel.generateContent([{ text: prompt }]);
        const res = result.response.text();
        aiText = typeof res === "string" ? JSON.parse(res) : res;

        if (!aiText) {
          return {
            status: "rejected",
            message: "AI response is missing or empty, cannot generate analysis.",
            response: null,
          } as AIResponse;
        }

        return aiText;
      }
      throw err;
    }
  }
}
