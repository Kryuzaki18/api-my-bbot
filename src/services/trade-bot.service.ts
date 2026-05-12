import { GeminiService } from "./gemini.service.js";
import { binanceService } from "./binance.singleton.js";
import { OrderSide, OrderType } from "../models/order.model.js";
import { AIType, type AIResponse, type AISignal } from "../models/ai.model.js";

type TradeBotInput = {
  geminiApiKey: string;
  apiKey: string;
  apiSecret: string;
  useTestnet: boolean;
  symbol: string;
  interval: string;
  quantity?: number;
  usdAmount?: number;
  leverage?: number;
  type?: AIType;
};

export class TradeBotService {
  private readonly MIN_NOTIONAL = 50;

  private getOrderSide(signalType: OrderSide) {
    return signalType === OrderSide.BUY ? OrderSide.BUY : OrderSide.SELL;
  }

  private getExitSide(entrySide: OrderSide) {
    return entrySide === OrderSide.BUY ? OrderSide.SELL : OrderSide.BUY;
  }

  private resolveQuantity(
    quantity: number | undefined,
    usdAmount: number | undefined,
    leverage: number,
    entry: number,
  ) {
    if (quantity && quantity > 0) {
      return quantity;
    }

    if (usdAmount && usdAmount > 0) {
      // Keep sizing behavior consistent with manual order flow:
      // position notional = amount * leverage, then derive quantity from entry price.
      return (usdAmount * leverage) / entry;
    }

    throw Object.assign(new Error("Either quantity or usdAmount must be provided."), {
      status: 400,
    });
  }

  private normalizeAnalysis(raw: unknown): AIResponse {
    if (typeof raw === "string") {
      return JSON.parse(raw) as AIResponse;
    }

    return (raw ?? {}) as AIResponse;
  }

  async execute(input: TradeBotInput) {
    const geminiService = new GeminiService(input.geminiApiKey);
    const analysis = this.normalizeAnalysis(
      await geminiService.analyze(input.symbol, input.interval, input.type ?? AIType.GENERAL),
    );

    if (analysis?.status !== "accepted" || !analysis?.response) {
      throw Object.assign(
        new Error(analysis?.message || "AI confluence not met. No trade executed."),
        { status: 400 },
      );
    }

    const signal = analysis.response as AISignal;
    const entryPrice = (Number(signal.entryZone?.[0]) + Number(signal.entryZone?.[1])) / 2;
    const orderSide = this.getOrderSide(signal.type);
    const exitSide = this.getExitSide(orderSide);
    const leverage = input.leverage ?? signal.leverage;
    const quantity = this.resolveQuantity(input.quantity, input.usdAmount, leverage, entryPrice);
    const notional = quantity * entryPrice;

    if (notional < this.MIN_NOTIONAL) {
      throw Object.assign(
        new Error(
          `Order notional is too small. Minimum is ${this.MIN_NOTIONAL} USDT, current is ${notional.toFixed(2)} USDT.`,
        ),
        { status: 400 },
      );
    }

    const order = await binanceService.placeOrder(input.apiKey, input.apiSecret, {
      symbol: input.symbol.toUpperCase(),
      side: orderSide,
      type: OrderType.MARKET,
      quantity,
      leverage,
      useTestnet: input.useTestnet,
    });

    const takeProfit = await binanceService.placeTakeProfitOrder(input.apiKey, input.apiSecret, {
      symbol: input.symbol.toUpperCase(),
      side: orderSide,
      type: OrderType.TAKE_PROFIT_MARKET,
      triggerPrice: Number(signal.tp),
      closePosition: true,
      useTestnet: input.useTestnet,
    });

    const stopLoss = await binanceService.placeStopLossOrder(input.apiKey, input.apiSecret, {
      symbol: input.symbol.toUpperCase(),
      side: exitSide,
      type: OrderType.STOP_MARKET,
      triggerPrice: Number(signal.sl),
      closePosition: true,
      useTestnet: input.useTestnet,
    });

    return {
      message: "Auto bot trade executed successfully.",
      analysis,
      order,
      takeProfit,
      stopLoss,
    };
  }
}
