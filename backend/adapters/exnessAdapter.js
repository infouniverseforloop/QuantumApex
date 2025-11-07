// backend/adapters/exnessAdapter.js
// Exness skeleton adapter. Implement real login & candle fetch per Exness API docs.
const axios = require('axios');
const { info, warn } = require('../logger');

let connected = false;

async function init(){
  const user = process.env.EXNESS_USERNAME || '';
  const pass = process.env.EXNESS_PASSWORD || '';
  const wsUrl = process.env.EXNESS_WS_URL || '';
  if(!user || !pass || !wsUrl){
    warn('Exness adapter needs EXNESS username/password/WS_URL');
    return false;
  }
  // Real implementation needed here — for now we mark connected false unless you implement
  // If you integrate with Exness API, set connected=true after login
  warn('Exness adapter skeleton present — implement Exness API login in this file');
  return false;
}

async function fetchRecentCandles(pair, count=400){
  throw new Error('Exness fetch not implemented');
}

module.exports = { init, fetchRecentCandles };
