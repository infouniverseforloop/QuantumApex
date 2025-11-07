// backend/aiLearner.js
const fs = require('fs');
const path = require('path');
const { info } = require('./logger');
const FILE = path.join(__dirname, '..', 'data', 'learner.json');

function ensure(){
  const dir = path.dirname(FILE);
  if(!fs.existsSync(dir)) fs.mkdirSync(dir);
  if(!fs.existsSync(FILE)) fs.writeFileSync(FILE, JSON.stringify({ weight:1.0, history:[] }, null, 2));
}
function load(){ ensure(); return JSON.parse(fs.readFileSync(FILE)); }
function save(o){ fs.writeFileSync(FILE, JSON.stringify(o, null, 2)); }

function getWeight(){ return load().weight || 1.0; }

function recordResult(sig, result){
  const data = load();
  data.history = data.history || [];
  data.history.push({ t: new Date().toISOString(), id: sig.id, pair: sig.pair, conf: sig.confidence, result });
  const recent = data.history.slice(-50);
  const wins = recent.filter(r=>r.result==='WIN').length;
  const losses = recent.filter(r=>r.result==='LOSS').length;
  if(losses > wins + 3) data.weight = Math.max(0.6, data.weight * 0.97);
  else if(wins > losses + 3) data.weight = Math.min(1.6, data.weight * 1.02);
  save(data);
  info('aiLearner updated weight: ' + data.weight);
}

module.exports = { getWeight, recordResult, load };
