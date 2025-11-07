// backend/adapters/quotexAdapter.js
// Minimal WS adapter skeleton for Quotex. Requires QUOTEX_WS_URL + QUOTEX_EMAIL + QUOTEX_PASSWORD
// This file must be implemented for your broker. Provided is a safe skeleton that attempts a WS connection if URL present.

const WebSocket = require('ws');
const axios = require('axios');
const { info, warn, dbg } = require('../logger');

let ws = null;
let connected = false;
let lastTick = {}; // latest price map by pair

async function init(){
  const url = process.env.QUOTEX_WS_URL || '';
  const email = process.env.QUOTEX_EMAIL || '';
  const pass = process.env.QUOTEX_PASSWORD || '';
  if(!url || !email || !pass){
    warn('Quotex adapter missing QUOTEX_WS_URL/EMAIL/PASSWORD — cannot init');
    return false;
  }
  try{
    // If your broker needs a REST login to obtain token, implement here.
    // For now attempt WS connection (this step may require custom handshake)
    ws = new WebSocket(url, { handshakeTimeout: 15000 });
    ws.on('open', ()=> { connected = true; info('Quotex WS open'); });
    ws.on('message', (m)=> {
      try{
        const d = JSON.parse(m.toString());
        // adapt to actual message format: this is placeholder
        if(d.type === 'tick' && d.pair && d.price){
          lastTick[d.pair] = { price: d.price, ts: Math.floor(Date.now()/1000) };
        }
      }catch(e){}
    });
    ws.on('close', ()=> { connected = false; warn('Quotex WS closed'); });
    ws.on('error', (e)=> { connected = false; warn('Quotex WS error: ' + e.message); });
    // allow a short delay to connect
    await new Promise(res => setTimeout(res, 1500));
    return connected;
  }catch(e){
    warn('Quotex init error: ' + e.message);
    return false;
  }
}

async function fetchRecentCandles(pair, count=400){
  // This adapter must return an array of candles: [{time,open,high,low,close,volume},...]
  // For real mode we must implement actual API. Placeholder here throws unless lastTick exists.
  if(!connected) throw new Error('Quotex not connected');
  const t = lastTick[pair];
  if(!t) throw new Error('No tick data for '+pair);
  // Build synthetic candle sequence from last price (not ideal). In real use replace this with broker candle feed.
  const now = Math.floor(Date.now()/1000);
  const arr = [];
  let base = t.price;
  for(let i = count; i >= 1; i--){
    const ts = now - i;
    const noise = (Math.random()-0.5) * 0.0006;
    const close = +(base + noise).toFixed(5);
    const open = +(close + ((Math.random()-0.5) * 0.0004)).toFixed(5);
    const high = Math.max(open, close) + Math.random()*0.0003;
    const low = Math.min(open, close) - Math.random()*0.0003;
    const vol = Math.floor(10 + Math.random()*200);
    arr.push({ time: ts, open, high, low, close, volume: vol });
  }
  return arr;
}

module.exports = { init, fetchRecentCandles };
