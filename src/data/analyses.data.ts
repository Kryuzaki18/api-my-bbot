const analyses = [
  {
    status: "accepted",
    message:
      "On the 1d timeframe, BTCUSDT continues to exhibit a structural uptrend, though recent 15m data indicates a necessary cooling period after reaching the 79,000–79,400 resistance zone. The daily candle is currently showing signs of distribution as momentum oscillators on lower timeframes begin to diverge from price action. We are observing a shift in market structure from bullish to neutral-bearish on the scalp timeframes as the 78,500 support level was breached with significant volume. Today's price action is characterized by a mean-reversion attempt toward the daily 9-EMA. While the long-term bias remains constructive, the immediate risk is skewed to the downside as the market seeks a higher-low entry on the 4h and 1d timeframes. Confluence from volume profile and recent swing failures suggests a 'sell on rally' environment for intraday traders, targeting the liquidity cluster situated near 77,200.",
    response: {
      signal: {
        type: "sell",
        entryZone: [78150, 78300],
        sl: 78655,
        tp: 77150,
        leverage: 15,
        riskReward: 2.22,
        reasoning:
          "The 15m timeframe shows a breakdown of the previous support at 78,500, now flipping into resistance. A bearish head-and-shoulders pattern is visible with the neckline retest coinciding with the 20-period EMA. RSI has rejected the 50-level, confirming bearish momentum control.",
        confidence: {
          score: 78,
          components: {
            trend: 65,
            momentum: 85,
            volume: 80,
            structure: 82,
          },
        },
      },
      buy: [
        {
          indicators: ["RSI Oversold", "Stochastic RSI"],
          pattern: ["Double Bottom"],
          leverage: 5,
          entryZone: [77150, 77350],
          sl: 76800,
          tp: 78400,
          riskReward: 2.27,
        },
        {
          indicators: ["Fibonacci 0.618", "Volume Profile POC"],
          pattern: ["Bullish Pin Bar"],
          leverage: 12,
          entryZone: [77400, 77550],
          sl: 77100,
          tp: 78500,
          riskReward: 2.44,
        },
        {
          indicators: ["VWAP", "MACD Bullish Cross"],
          pattern: ["Ascending Triangle"],
          leverage: 18,
          entryZone: [77750, 77850],
          sl: 77500,
          tp: 78600,
          riskReward: 2.5,
        },
      ],
      sell: [
        {
          indicators: ["EMA 50 Resistance", "RSI Bearish Divergence"],
          pattern: ["Bearish Engulfing"],
          leverage: 8,
          entryZone: [78200, 78400],
          sl: 78750,
          tp: 77200,
          riskReward: 2.18,
        },
        {
          indicators: ["Bollinger Band Upper Touch", "MFI High"],
          pattern: ["Rising Wedge Breakdown"],
          leverage: 15,
          entryZone: [78100, 78250],
          sl: 78600,
          tp: 77100,
          riskReward: 2.3,
        },
        {
          indicators: ["Ichimoku Cloud Kumo Breakout", "Volume Spike"],
          pattern: ["Head and Shoulders"],
          leverage: 20,
          entryZone: [78050, 78150],
          sl: 78450,
          tp: 77200,
          riskReward: 2.12,
        },
      ],
    },
  },
];

export default analyses;
