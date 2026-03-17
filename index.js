require('dotenv').config();
const express = require('express');
const ccxt = require('ccxt');

const app = express();
app.use(express.json());

// Map TradingView tickers to MEXC market symbols
const symbolMap = {
  "XAUUSD": "GOLD(XAUT)/USDT",
  "BTCUSD": "BTC/USDT"
};

// Initialize MEXC client and load markets once
const exchange = new ccxt.mexc({
  apiKey: process.env.MEXC_API_KEY,
  secret: process.env.MEXC_API_SECRET
});

(async () => {
  await exchange.loadMarkets();
  console.log('Markets loaded');

  // Health check
  app.get('/', (req, res) => {
    res.send('✅ Bot is up');
  });

  // Webhook receiver
  app.post('/webhook', async (req, res) => {
    try {
      // 1) Parse and map symbol
      const { symbol: tvSymbol, dir, entry, stop, tp } = req.body;
      const market = symbolMap[tvSymbol] || tvSymbol;

      if (!market || !dir || entry == null || stop == null || tp == null) {
        throw new Error('Missing symbol, dir, entry, stop, or tp');
      }

      // 2) Hard-coded order quantity (in XAU)
      const amount = 0.1;

      // 3) Determine side
      const side = dir === 'long' ? 'buy' : 'sell';

      // 4) Execute orders
      await exchange.createMarketOrder(market, side, amount);
      await exchange.createOrder(
        market,
        'stop',
        side === 'buy' ? 'sell' : 'buy',
        amount,
        undefined,
        { stopPrice: stop }
      );
      await exchange.createLimitOrder(
        market,
        'limit',
        side === 'buy' ? 'sell' : 'buy',
        amount,
        tp
      );

      res.json({ success: true });
    } catch (err) {
      console.error('Webhook error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // 5) Start the server
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Listening on 0.0.0.0:${PORT}`);
  });
})();

