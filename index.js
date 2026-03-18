require('dotenv').config();
const express = require('express');
const ccxt = require('ccxt');

const app = express();
app.use(express.json());

const exchange = new ccxt.okx({
  apiKey: process.env.OKX_API_KEY,
  secret: process.env.OKX_API_SECRET,
  password: process.env.OKX_API_PASSPHRASE,
  options: { defaultType: 'spot' }
});

(async () => {
  await exchange.loadMarkets();
  console.log('OKX markets loaded');

  app.get('/', (req, res) => res.send('✅ Bot is up on OKX'));

  app.post('/webhook', async (req, res) => {
    try {
      const { symbol: tvSymbol, dir, entry, stop, tp } = req.body;
      if (!tvSymbol || !dir || entry == null || stop == null || tp == null) {
        throw new Error('Missing one of symbol, dir, entry, stop, or tp');
      }

      // Auto-detect XAU spot on OKX:
      const market = exchange.symbols.includes('XAUT/USDT')
        ? 'XAUT/USDT'
        : exchange.symbols.find(s => s.startsWith('XAU/USDT'));

      if (!exchange.markets[market]) {
        throw new Error(`Market not found: ${market}`);
      }

      const amount = 0.1;
      const side   = dir === 'long' ? 'buy' : 'sell';

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
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Listening on 0.0.0.0:${PORT} (OKX Spot)`);
  });
})();

