require('dotenv').config();
const express = require('express');
const ccxt = require('ccxt');

const app = express();
app.use(express.json());

// 1) Map TradingView tickers to MEXC market symbols
const symbolMap = {
  "XAUUSD": "GOLD(XAUT)/USDT",
  "BTCUSD": "BTC/USDT"
  // add more mappings here if needed
};

// 2) Initialize exchange client
const exchange = new ccxt.mexc({
  apiKey: process.env.MEXC_API_KEY,
  secret: process.env.MEXC_API_SECRET,
});

// 3) Health-check endpoint
app.get('/', (req, res) => {
  res.send('✅ Bot is up');
});

// 4) Webhook handler—read JSON, map symbol, place orders
app.post('/webhook', async (req, res) => {
  try {
    // Destructure the JSON and map to real market name
    const { symbol: tvSymbol, dir, entry, stop, tp } = req.body;
    const market = symbolMap[tvSymbol] || tvSymbol;

    // Validate payload
    if (!market || !dir || entry == null || stop == null || tp == null) {
      throw new Error('Missing symbol, dir, entry, stop, or tp');
    }

    // Determine side and amount
    const side = dir === 'long' ? 'buy' : 'sell';
    const amount = 1;

    // Execute orders
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

    // Respond success
    res.json({ success: true });
  } catch (err) {
    console.error('Webhook error:', err);
    res.status(500).json({ error: err.message });
  }
});

// 5) Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`);
});

