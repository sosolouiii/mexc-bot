require('dotenv').config();
const express = require('express');
const ccxt = require('ccxt');

const app = express();
app.use(express.json());

const symbolMap = {
  "XAUUSD": "GOLD(XAUT)/USDT",
  "BTCUSD": "BTC/USDT"
};

const exchange = new ccxt.mexc({
  apiKey: process.env.MEXC_API_KEY,
  secret: process.env.MEXC_API_SECRET,
});

(async () => {
  // Load all markets one time at startup
  await exchange.loadMarkets();
  console.log('Markets loaded');

  // Health check
  app.get('/', (req, res) => res.send('✅ Bot is up'));

  // Webhook
  app.post('/webhook', async (req, res) => {
    try {
      const { symbol: tvSymbol, dir, entry, stop, tp } = req.body;
      const market = symbolMap[tvSymbol] || tvSymbol;

      if (!market || !dir || entry == null || stop == null || tp == null) {
        throw new Error('Missing symbol, dir, entry, stop, or tp');
      }

      const info = exchange.markets[market];
      if (!info) throw new Error(`Market ${market} not found`);

      const amount = info.limits.amount.min;
      const side   = dir === 'long' ? 'buy' : 'sell';

      // Place orders
      await exchange.createMarketOrder(market, side, amount);
      await exchange.createOrder(market, 'stop', side === 'buy' ? 'sell' : 'buy', amount, undefined, { stopPrice: stop });
      await exchange.createLimitOrder(market, 'limit', side === 'buy' ? 'sell' : 'buy', amount, tp);

      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  // Start server
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`Listening on port ${PORT}`));
})();

