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

// Initialize the MEXC client
const exchange = new ccxt.mexc({
  apiKey: process.env.MEXC_API_KEY,
  secret: process.env.MEXC_API_SECRET
});

// Health-check endpoint
app.get('/', (req, res) => {
  res.send('✅ Bot is up');
});

// Webhook receiver
app.post('/webhook', async (req, res) => {
  try {
    // 1) Parse payload and map ticker → market
    const { symbol: tvSymbol, dir, entry, stop, tp } = req.body;
    const market = symbolMap[tvSymbol] || tvSymbol;

    if (!market || !dir || entry == null || stop == null || tp == null) {
      throw new Error('Missing symbol, dir, entry, stop, or tp');
    }

    // 2) Load or reload market definitions
    await exchange.loadMarkets();
    const info = exchange.markets[market];
    if (!info) {
      throw new Error(`Market definition for ${market} not found`);
    }

    // 3) Determine order quantity from the exchange’s minimum lot size
    const amount = info.limits.amount.min;
    if (!amount || amount <= 0) {
      throw new Error(`Invalid min amount for ${market}: ${amount}`);
    }

    // 4) Compute side and place orders
    const side = dir === 'long' ? 'buy' : 'sell';
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

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`);
});

