import type { OrderSide } from "./order.model.js";

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

export enum AIType {
  GENERAL = "general",
  TRADE_BOT = "trade-bot",
}

export interface AIResponse {
  status: string;
  message: string;
  response: AISignal | null;
}

export interface AISignal {
  type: OrderSide;
  entryZone: number[];
  sl: number;
  tp: number;
  leverage: number;
  riskReward: number;
  reasoning: string;
  confidence: AIConfidence;
}

export interface AIConfidence {
  score: number;
  components: {
    trend: number;
    momentum: number;
    volume: number;
    structure: number;
  };
}