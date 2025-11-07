// backend/brokerManager.js
// Orchestrates adapters: requires at least one real adapter to be enabled to produce signals
const { info, warn, dbg } = require('./logger');
const quotexAdapter = require('./adapters/quotexAdapter');
const exnessAdapter = require('./adapters/exnessAdapter');

let adapters = { quotex: null, exness: null };
let activeAdapters = [];

async function init(){
  info('Initializing broker adapters...');
  try{
    if(process.env.USE_REAL_QUOTEX === 'true'){
      adapters.quotex = quotexAdapter;
      const ok = await adapters.quotex.init();
      if(ok) { activeAdapters.push('quotex'); info('Quotex adapter ready'); } else warn('Quotex adapter init failed');
    } else info('Quotex adapter disabled by env');

    if(process.env.USE_REAL_EXNESS === 'true'){
      adapters.exness = exnessAdapter;
      const ok = await adapters.exness.init();
      if(ok) { activeAdapters.push('exness'); info('Exness adapter ready'); } else warn('Exness adapter init failed');
    } else info('Exness adapter disabled by env');

    if(activeAdapters.length === 0){
      warn('No active real adapters. Engine will stay in safe-mode (no live signals). Set USE_REAL_* env to true and configure adapter settings.');
    }
  }catch(e){
    warn('brokerManager init error: ' + e.message);
  }
  return { adapters, activeAdapters };
}

function getActiveAdapters(){ return activeAdapters.slice(); }

module.exports = { init, getActiveAdapters };
