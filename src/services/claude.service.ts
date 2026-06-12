import Anthropic from "@anthropic-ai/sdk";
import {
  AI_MODELS,
  AI_ANALYZE_MARKET_TEMPLATE,
  AI_CHAT_PROMPTS_TEMPLATE,
  AI_TRADE_BOT_TEMPLATE,
} from "../constants/ai.constant.js";
import {
  MAX_HISTORY_MESSAGES,
  RESPONSE_MESSAGES,
} from "../constants/auth.constant.js";
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

  private extractJSON(text: string): any | null {
    const stripped = text.trim();
    const candidates: string[] = [];

    const codeBlock = stripped.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (codeBlock?.[1]) candidates.push(codeBlock[1].trim());

    const jsonObject = stripped.match(/\{[\s\S]*\}/);
    if (jsonObject) candidates.push(jsonObject[0]);

    candidates.push(stripped);

    for (const candidate of candidates) {
      try {
        const result = JSON.parse(candidate);
        if (result && typeof result === "object") return result;
      } catch {}
    }

    return null;
  }

  async chat(
    identifier: string,
    message: string,
    history: ConversationMessage[] = [],
    hasConvo: boolean,
  ) {
    const messages: Anthropic.MessageParam[] = [
      ...history.map((msg, index) => ({
        role: msg.role as "user" | "assistant",
        content:
          index === history.length - 1
            ? [
                {
                  type: "text" as const,
                  text: msg.content,
                  cache_control: { type: "ephemeral" as const },
                },
              ]
            : msg.content,
      })),
      { role: "user" as const, content: message },
    ];

    const stream = this.client.messages.stream({
      model: AI_MODELS.CLAUDE_HAIKU_4_5,
      max_tokens: 1024,
      system: [
        {
          type: "text",
          text:
            AI_CHAT_PROMPTS_TEMPLATE +
            "\nReturn ONLY valid JSON. No markdown, no code blocks.",
          cache_control: { type: "ephemeral" },
        },
      ],
      messages,
    });

    const response = await stream.finalMessage();
    const textBlock = response.content.find((b) => b.type === "text");

    if (!textBlock || textBlock.type !== "text") {
      throw new Error(RESPONSE_MESSAGES.SOMETHING_WENT_WRONG);
    }

    const parsed = this.extractJSON(textBlock.text);
    if (!parsed)
      return {
        status: "rejected",
        message: RESPONSE_MESSAGES.SOMETHING_WENT_WRONG,
        response: null,
      };

    const status = parsed.status as "accepted" | "rejected";

    const newMessages = [
      { role: "user", status, content: message },
      { role: "assistant", status, content: parsed.message },
    ];

    if (hasConvo) {
      await Conversation.findOneAndUpdate(
        { identifier, deletedAt: null },
        {
          $push: {
            messages: {
              $each: newMessages,
              $slice: -MAX_HISTORY_MESSAGES,
            },
          },
        },
        { sort: { createdAt: -1 } },
      );
    } else {
      await Conversation.create({
        identifier,
        messages: newMessages,
        deletedAt: null,
      });
    }

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

    const stream = this.client.messages.stream({
      model: AI_MODELS.CLAUDE_4_8,
      max_tokens: 4096,
      thinking: { type: "adaptive" },
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text:
                template +
                "\nReturn ONLY valid JSON. No markdown, no code blocks.",
              cache_control: { type: "ephemeral" },
            },
            {
              type: "text",
              text:
                `Here is the marketData for ${symbol} with timeframe ${interval}:\n` +
                JSON.stringify(klines),
            },
          ],
        },
      ],
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
