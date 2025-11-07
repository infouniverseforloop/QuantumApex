// backend/patternAnalyzer.js
function isRoundNumber(price){
  const s = price.toString();
  if(s.includes('.')){
    const frac = s.split('.')[1];
    return frac.endsWith('000') || frac === '0000';
  }
  return true;
}

function detectOrderBlock(candles){
  if(!candles || candles.length < 5) return null;
  const prev = candles[candles.length-2];
  const body = Math.abs(prev.close - prev.open);
  const avg = candles.slice(-12).reduce((a,b)=>a+Math.abs(b.close-b.open),0)/12 || 0.0001;
  if(body > avg * 1.6){
    return { time: prev.time, zone: [Math.min(prev.open, prev.close), Math.max(prev.open, prev.close)], strength: body/avg };
  }
  return null;
}

module.exports = { isRoundNumber, detectOrderBlock };
