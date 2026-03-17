require('dotenv').config();
const express = require('express');
const ccxt = require('ccxt');

const app = express();
app.use(express.json());

const exchange = new ccxt.mexc({
  apiKey: process.env.MEXC_API_KEY,
  secret: process.env.MEXC_API_SECRET
});

(async () => {
  await exchange.loadMarkets();
  console.log('Markets loaded');

  app.get('/', (req, res) => res.send('✅ Bot is up'));

  app.post('/webhook', async (req, res) => {
    try {
      const { symbol: tvSymbol, dir, entry, stop, tp } = req.body;
      if (!tvSymbol || !dir || entry == null || stop == null || tp == null) {
        throw new Error('Missing one of symbol, dir, entry, stop, or tp');
      }

      // Auto-detect USDT market
      const base   = tvSymbol.replace('USD','');
      const market = exchange.symbols.find(
        s => s.startsWith(base) && s.endsWith('USDT')
      );
      if (!exchange.markets[market]) {
        throw new Error(`Market not found: ${market}`);
      }

      // Determine minimum and precision
      const info      = exchange.markets[market];
      const minAmt    = info.limits.amount.min;
      const precision = info.precision.amount;

      // Compute a valid order size:
      let amount;
      if (precision === 0) {
        // whole numbers only → round up to 1 or higher
        amount = Math.ceil(minAmt);
      } else {
        // use the min amount, rounded to allowed decimals
        amount = parseFloat(minAmt.toFixed(precision));
      }

      const side = dir === 'long' ? 'buy' : 'sell';

      // Place the orders
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

  const PORT = process.env.PORT || 3000;
  app.listen(PORT, '0.0.0.0', () =>
    console.log(`Listening on 0.0.0.0:${PORT}`)
  );
})();

