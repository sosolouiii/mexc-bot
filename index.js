// index.js
require('dotenv').config()
const express = require('express')
const ccxt    = require('ccxt')

// Instantiate MEXC client via CCXT
const exchange = new ccxt.mexc({
  apiKey: process.env.MEXC_API_KEY,
  secret: process.env.MEXC_API_SECRET,
  enableRateLimit: true,
})

const app = express()
app.use(express.json())

// Health-check endpoint
app.get('/', (req, res) => {
  console.log('🔍 Received GET /')
  res.send('✅ Bot is up')
})

// Webhook endpoint for TradingView alerts
app.post('/webhook', async (req, res) => {
  try {
    // FALLBACK operator || must be present
const msg = req.body.alert_message || req.body.msg || ''
    // Example: "🟢 LONG @ 1920.5 | STOP: 1910.0 | TP: 1940.0"
    const parts = msg.split('|').map(s => s.trim())
    const side  = parts[0].startsWith('🟢') ? 'buy' : 'sell'
    const entry = parseFloat(parts[0].split('@')[1])
    const stop  = parseFloat(parts[1].split(':')[1])
    const tp    = parseFloat(parts[2].split(':')[1])

    // Configure your symbol and size
    const symbol = 'XAU/USDT'
    const amount = 1

    // 1) Execute market entry
    await exchange.createMarketOrder(symbol, side, amount)

    // 2) Attach stop-loss
    await exchange.createOrder(
      symbol,
      'stop',
      side === 'buy' ? 'sell' : 'buy',
      amount,
      undefined,
      { stopPrice: stop }
    )

    // 3) Attach take-profit
    await exchange.createLimitOrder(
      symbol,
      'limit',
      side === 'buy' ? 'sell' : 'buy',
      amount,
      tp
    )

    res.json({ success: true })
  } catch (err) {
    console.error('Webhook error:', err)
    res.status(500).json({ error: err.message })
  }
})

// Start the server (notice the || operator and backticks)
const PORT = process.env.PORT || 3000
app.listen(PORT, '0.0.0.0', () => console.log(`✅ MEXC bot listening on port ${PORT}`))

