import type { OrderSide } from "./order.model.js";

export enum AIType {
  GENERAL = "general",
  TRADE_BOT = "trade-bot",
}

export interface AIResponse {
  status: string;
  message: string;
  response: AIResponseData | null;
}

export interface AIResponseData {
  signal: AISignal;
  buy: AIResponseDataEntry[];
  sell: AIResponseDataEntry[];
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

export interface AIResponseDataEntry {
  indicators: string[];
  pattern: string[];
  entryZone: number[];
  sl: number;
  tp: number;
  leverage: number;
  riskReward: number;
}