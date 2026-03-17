require('dotenv').config();
const express = require('express');
const ccxt = require('ccxt');

const app = express();
// Parse incoming JSON body
app.use(express.json());

// Initialize MEXC exchange client
const exchange = new ccxt.mexc({
  apiKey: process.env.MEXC_API_KEY,
  secret: process.env.MEXC_API_SECRET,
});

// Health check endpoint
app.get('/', (req, res) => {
  res.send('✅ Bot is up');
});

// Webhook receiver
app.post('/webhook', async (req, res) => {
  try {
    // Destructure JSON payload
    const { symbol, dir, entry, stop, tp } = req.body;

    if (!symbol || !dir || entry == null || stop == null || tp == null) {
      throw new Error('Missing one of symbol, dir, entry, stop, tp');
    }

    // Determine side and a fixed amount
    const side = dir === 'long' ? 'buy' : 'sell';
    const amount = 1;

    // Execute market order, stop loss, and take profit
    await exchange.createMarketOrder(symbol, side, amount);
    await exchange.createOrder(
      symbol,
      'stop',
      side === 'buy' ? 'sell' : 'buy',
      amount,
      undefined,
      { stopPrice: stop }
    );
    await exchange.createLimitOrder(
      symbol,
      'limit',
      side === 'buy' ? 'sell' : 'buy',
      amount,
      tp
    );

    res.json({ success: true });
  } catch (err) {
    console.error('Webhook handler error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Listening on port ${PORT}`));

