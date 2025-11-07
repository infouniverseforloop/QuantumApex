// backend/strategyCore.js
const { detectOrderBlock, isRoundNumber } = require('./patternAnalyzer');

function sma(arr,n){ if(!arr || arr.length < n) return null; return arr.slice(-n).reduce((a,b)=>a+b,0)/n; }
function rsi(closes, p=14){
  if(!closes || closes.length < p+1) return 50;
  let gains=0, losses=0;
  for(let i=closes.length-p;i<closes.length;i++){
    const d = closes[i] - closes[i-1];
    if(d>0) gains+=d; else losses+=Math.abs(d);
  }
  const avgG = gains/p, avgL = (losses/p) || 1e-8;
  const rs = avgG/avgL;
  return 100 - (100/(1+rs));
}

function aggregateHF(candles,factor){
  if(!candles || !candles.length) return [];
  const out=[];
  for(let i=0;i<candles.length;i+=factor){
    const ch=candles.slice(i,i+factor);
    out.push({ time: ch[0].time, open: ch[0].open, high: Math.max(...ch.map(c=>c.high)), low: Math.min(...ch.map(c=>c.low)), close: ch[ch.length-1].close, volume: ch.reduce((s,c)=>s+(c.volume||0),0) });
  }
  return out;
}

function computeSignal(pair, candles, opts={}){
  if(!candles || candles.length < 120) return { status:'hold', reason:'insufficient' };
  const closes = candles.map(c=>c.close);
  const sma5 = sma(closes,5), sma20 = sma(closes,20);
  const last = candles[candles.length-1], prev = candles[candles.length-2];
  const r = rsi(closes,14);
  const vols = candles.slice(-60).map(c=>c.volume||0); const avgVol = vols.reduce((a,b)=>a+b,0)/vols.length;
  const volSpike = (last.volume||0) > avgVol * parseFloat(process.env.VOL_SPIKE_MULT || '2.5');
  const h5 = aggregateHF(candles.slice(-300),5);
  const h5c = h5.map(c=>c.close);
  const h5s5 = h5c.length>=5 ? sma(h5c,5) : null;
  const h5s20 = h5c.length>=20 ? sma(h5c,20) : null;
  const htfBull = h5s5 && h5s20 && h5s5 > h5s20;
  const htfBear = h5s5 && h5s20 && h5s5 < h5s20;
  const ob = detectOrderBlock(candles);
  const round = isRoundNumber(last.close);

  let score = 50;
  const bullish = sma5 > sma20 && last.close > prev.close;
  const bearish = sma5 < sma20 && last.close < prev.close;
  if(bullish) score += 12;
  if(bearish) score -= 12;
  if(r < 35) score += 8;
  if(r > 65) score -= 8;
  if(volSpike) score += 6;
  if(ob) score += 6;
  if(htfBull) score += 8;
  if(htfBear) score -= 8;
  if(round) score += 2;

  const layers = (bullish||bearish?1:0) + (volSpike?1:0) + (ob?1:0) + (htfBull||htfBear?1:0);
  if(layers < 2) return { status:'hold', reason:'no-confirm' };

  score = Math.max(10, Math.min(99, Math.round(score)));
  const CALL = parseInt(process.env.CONF_THRESHOLD_CALL||'70',10);
  const PUT  = parseInt(process.env.CONF_THRESHOLD_PUT||'30',10);

  const direction = score >= CALL ? 'CALL' : (score <= PUT ? 'PUT' : (bullish ? 'CALL' : 'PUT'));
  // compute SL/TP (forex): ATR-like simple method
  const recent = candles.slice(-14).map(c=>Math.abs(c.high - c.low));
  const atr = recent.reduce((a,b)=>a+b,0)/recent.length;
  const sl = +(direction === 'CALL' ? (last.close - atr* parseFloat(process.env.SL_ATR_MULT || '1.2')) : (last.close + atr* parseFloat(process.env.SL_ATR_MULT || '1.2'))).toFixed(5);
  const tp = +(direction === 'CALL' ? (last.close + atr* parseFloat(process.env.TP_ATR_MULT || '2.0')) : (last.close - atr* parseFloat(process.env.TP_ATR_MULT || '2.0'))).toFixed(5);

  if(opts.mode === 'god') score = Math.min(99, score + (parseInt(process.env.GOD_MODE_BOOST||'4',10)));

  return {
    status:'ok',
    pair,
    direction,
    confidence: score,
    entry: last.close,
    sl, tp,
    entry_ts: Math.floor(Date.now()/1000),
    expiry_ts: Math.floor(Date.now()/1000) + parseInt(process.env.BINARY_EXPIRY_SECONDS || '60',10),
    notes: `rsi:${Math.round(r)}|volSpike:${volSpike}|ob:${!!ob}|htf:${htfBull?'BULL':htfBear?'BEAR':'NONE'}`
  };
}

module.exports = { computeSignal };
