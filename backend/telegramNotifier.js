// backend/telegramNotifier.js
const axios = require('axios');
const { info, warn } = require('./logger');

const TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const CHAT_ID = process.env.TELEGRAM_CHAT_ID || '';

async function send(text){
  if(!TOKEN || !CHAT_ID){
    warn('Telegram not configured');
    return false;
  }
  try{
    const url = `https://api.telegram.org/bot${TOKEN}/sendMessage`;
    await axios.post(url, { chat_id: CHAT_ID, text, parse_mode: 'HTML' }, { timeout: 10000 });
    info('Telegram message sent');
    return true;
  }catch(e){
    warn('Telegram send failed: ' + (e.response && e.response.data ? JSON.stringify(e.response.data) : e.message));
    return false;
  }
}

function formatSignal(sig){
  // sig = { pair, mode, direction, confidence, entry, entry_ts, expiry_ts, sl, tp, notes, branding }
  const when = new Date((sig.entry_ts||Date.now()/1000)*1000).toLocaleString();
  const expiry = sig.expiry_ts ? new Date(sig.expiry_ts*1000).toLocaleString() : '-';
  const lines = [
    `<b>Quantum Apex — Signal</b>`,
    `Owner: <b>${(sig.branding && sig.branding.owner) || process.env.OWNER_NAME || 'Owner'}</b>`,
    `Pair: <b>${sig.pair}</b>`,
    `Mode: <b>${sig.mode || 'AUTO'}</b>`,
    `Type: <b>${sig.direction}</b>`,
    `Confidence: <b>${sig.confidence}%</b>`,
    `Entry: <code>${sig.entry}</code> at ${when}`,
    `SL: <code>${sig.sl || '-'}</code> | TP: <code>${sig.tp || '-'}</code>`,
    `Expiry: ${expiry}`,
    `Notes: ${sig.notes || '-'}`,
    `Branding: Quantum Apex System • David Mamun William`
  ];
  if(sig.result) lines.push(`<b>Result: ${sig.result}</b>`);
  return lines.join('\n');
}

module.exports = { send, formatSignal };
