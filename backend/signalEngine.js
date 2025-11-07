// backend/signalEngine.js
const { info, warn } = require('./logger');
const brokerManager = require('./brokerManager');
const { computeSignal } = require('./strategyCore');
const { send, formatSignal } = require('./telegramNotifier');
const { backupSignal } = require('./cloudBackup');
const { getWeight, recordResult } = require('./aiLearner');
const { broadcast } = require('./dashboard');
const { initMongo, getDb } = require('./mongoClient');

const WATCH = (process.env.WATCH_SYMBOLS || 'EUR/USD,GBP/USD,USD/JPY,AUD/USD,USD/CAD,USD/CHF,NZD/USD').split(',').map(s=>s.trim());
const SCAN_INTERVAL = parseInt(process.env.SCAN_INTERVAL_MS || '4000', 10);
const MIN_CONF = parseInt(process.env.MIN_CONFIDENCE || '80', 10);

function sleep(ms){ return new Promise(res=>setTimeout(res, ms)); }

async function fetchCandlesFromAdapters(pair){
  const active = brokerManager.getActiveAdapters();
  if(!active || active.length === 0) throw new Error('No active adapters');
  // try adapters in order
  for(const a of active){
    try{
      if(a === 'quotex' && require('./adapters/quotexAdapter').fetchRecentCandles){
        const arr = await require('./adapters/quotexAdapter').fetchRecentCandles(pair, 400);
        if(arr && arr.length) return arr;
      }
      if(a === 'exness' && require('./adapters/exnessAdapter').fetchRecentCandles){
        const arr = await require('./adapters/exnessAdapter').fetchRecentCandles(pair, 400);
        if(arr && arr.length) return arr;
      }
    }catch(e){
      warn('adapter fetch failed ('+a+'): ' + e.message);
    }
  }
  throw new Error('No adapter returned candles for ' + pair);
}

async function handleSignal(sig){
  try{
    // add branding
    sig.branding = { owner: process.env.OWNER_NAME || 'David Mamun William' };
    // broadcast to dashboard
    try { broadcast({ type:'signal', data: sig }); } catch(e){}
    // send to telegram
    await send(formatSignal(sig));
    // backup to firebase
    await backupSignal(sig);
    // mongo archive (optional)
    const db = getDb();
    if(db) await db.collection('signals').insertOne({ ...sig, created_at: new Date() });
    info(`Signal broadcasted: ${sig.pair} ${sig.direction} conf:${sig.confidence}`);
  }catch(e){
    warn('handleSignal error: ' + e.message);
  }

  // expiry watcher
  const ttl = Math.max(5, (sig.expiry_ts || Math.floor(Date.now()/1000)+60) - Math.floor(Date.now()/1000));
  setTimeout(async ()=>{
    try{
      // fetch final price for result
      const candles = await fetchCandlesFromAdapters(sig.pair); // recent
      const final = candles.length ? candles[candles.length-1].close : sig.entry;
      const win = (sig.direction === 'CALL') ? (final > sig.entry) : (final < sig.entry);
      sig.result = win ? 'WIN' : 'LOSS';
      sig.finalPrice = final;
      // backup result
      await backupSignal(sig);
      const db = getDb();
      if(db) await db.collection('results').insertOne({ ...sig, settled_at: new Date() });
      await send(formatSignal(sig));
      recordResult(sig, sig.result);
      broadcast({ type:'result', data: sig });
      info(`Signal resolved: ${sig.pair} => ${sig.result} (entry:${sig.entry} final:${final})`);
    }catch(e){
      warn('expiry handler error: ' + e.message);
    }
  }, ttl*1000 + 1500);
}

async function scanLoop(){
  // initialize mongo if configured
  await initMongo();
  info('Starting scan loop — real-only mode');
  while(true){
    try{
      // require active adapters
      const active = brokerManager.getActiveAdapters();
      if(!active || active.length === 0){
        warn('No active adapters — waiting for adapters to be configured');
        await sleep(5000);
        continue;
      }
      for(const pair of WATCH){
        try{
          const candles = await fetchCandlesFromAdapters(pair);
          const weight = getWeight();
          const base = computeSignal(pair, candles, { mode: process.env.MODE || 'normal' });
          if(!base || base.status !== 'ok') continue;
          base.confidence = Math.min(99, Math.round(base.confidence * weight));
          base.mode = process.env.MODE || 'normal';
          base.id = Date.now() + Math.floor(Math.random()*9999);
          if(base.confidence >= MIN_CONF){
            // safety: check spreads if adapter supports
            // broadcast
            await handleSignal(base);
            // wait until expiry to avoid overlap
            const waitSec = Math.max(5, (base.expiry_ts - Math.floor(Date.now()/1000)) + 2);
            await sleep(waitSec * 1000);
          }
        }catch(e){
          warn('pair iteration error: ' + e.message);
        }
      }
    }catch(e){
      warn('scanLoop outer error: ' + e.message);
    }
    await sleep(SCAN_INTERVAL);
  }
}

module.exports = { start: scanLoop, handleSignal, fetchCandlesFromAdapters };
