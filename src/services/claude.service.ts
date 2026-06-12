import Anthropic from "@anthropic-ai/sdk";
import {
  AI_MODELS,
  AI_ANALYZE_MARKET_TEMPLATE,
  AI_CHAT_PROMPTS_TEMPLATE,
  AI_TRADE_BOT_TEMPLATE,
} from "../constants/ai.constant.js";
import { MAX_HISTORY_MESSAGES, RESPONSE_MESSAGES } from "../constants/auth.constant.js";
import { BinanceService } from "./binance.service.js";
import Analyses, { type IAnalyses } from "../schema/analyses.schema.js";
import Conversation from "../schema/conversation.schema.js";
import {
  AIType,
  type AIResponse,
  type ConversationMessage,
} from "../models/ai.model.js";

export class ClaudeService {
  binanceService = new BinanceService();
  client: Anthropic;

  constructor(readonly claudeApiKey: string) {
    if (!claudeApiKey || !claudeApiKey.trim()) {
      throw Object.assign(new Error("CLAUDE_API_KEY is missing."), {
        status: 500,
      });
    }
    this.client = new Anthropic({ apiKey: claudeApiKey });
  }

  private extractJSON(text: string): any {
    const stripped = text.trim();
    const match = stripped.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    return JSON.parse(match?.[1] ?? stripped);
  }

  async chat(message: string, history: ConversationMessage[] = [], identifier: string) {
    const messages: Anthropic.MessageParam[] = [
      ...history.map((msg) => ({
        role: msg.role as "user" | "assistant",
        content: msg.content,
      })),
      { role: "user" as const, content: message },
    ];

    const stream = this.client.messages.stream({
      model: AI_MODELS.CLAUDE,
      max_tokens: 1024,
      system:
        AI_CHAT_PROMPTS_TEMPLATE +
        "\nReturn ONLY valid JSON. No markdown, no code blocks.",
      messages,
    });

    const response = await stream.finalMessage();
    const textBlock = response.content.find((b) => b.type === "text");

    if (!textBlock || textBlock.type !== "text") {
      throw new Error(RESPONSE_MESSAGES.SOMETHING_WENT_WRONG);
    }

    const parsed = this.extractJSON(textBlock.text);
    if (!parsed) throw new Error(RESPONSE_MESSAGES.SOMETHING_WENT_WRONG);

    const status = parsed.status as "accepted" | "rejected";

    await Conversation.findOneAndUpdate(
      { identifier },
      {
        $push: {
          messages: {
            $each: [
              { role: "user", status, content: message },
              { role: "assistant", status, content: parsed.message },
            ],
            $slice: -MAX_HISTORY_MESSAGES,
          },
        },
      },
      { upsert: true },
    );

    return parsed;
  }

  async analyze(
    symbol: string,
    interval: string,
    type: AIType = AIType.GENERAL,
  ) {
    const klines = await this.binanceService.getKlines(symbol, interval);

    if (!klines) {
      return {
        status: "rejected",
        message: "Market data is missing or empty, cannot generate analysis.",
        response: null,
      } as AIResponse;
    }

    const template =
      type === AIType.GENERAL
        ? AI_ANALYZE_MARKET_TEMPLATE
        : AI_TRADE_BOT_TEMPLATE;
    const dataPrompt =
      `Here is the marketData for ${symbol} with timeframe ${interval}:\n` +
      JSON.stringify(klines);
    const prompt =
      template +
      "\n" +
      dataPrompt +
      "\nReturn ONLY valid JSON. No markdown, no code blocks.";

    const stream = this.client.messages.stream({
      model: AI_MODELS.CLAUDE,
      max_tokens: 4096,
      thinking: { type: "adaptive" },
      messages: [{ role: "user", content: prompt }],
    });

    const response = await stream.finalMessage();
    const textBlock = response.content.find((b) => b.type === "text");

    if (!textBlock || textBlock.type !== "text") {
      return {
        status: "rejected",
        message: "AI response is missing or empty, cannot generate analysis.",
        response: null,
      } as AIResponse;
    }

    const aiText = this.extractJSON(textBlock.text);

    if (!aiText) {
      return {
        status: "rejected",
        message: "AI response is missing or empty, cannot generate analysis.",
        response: null,
      } as AIResponse;
    }

    await Analyses.create(aiText as unknown as IAnalyses);
    return aiText;
  }
}
