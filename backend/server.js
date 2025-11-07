// backend/server.js
require('dotenv').config();
const express = require('express');
const http = require('http');
const path = require('path');
const { info, warn } = require('./logger');
const { attachDashboard } = require('./dashboard');
const brokerManager = require('./brokerManager');
const { start } = require('./signalEngine');
const { getNetworkTime } = require('./timeSync');
const { send, formatSignal } = require('./telegramNotifier');
const { backupSignal } = require('./cloudBackup');

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

app.use(express.static(path.join(__dirname, '..', 'public')));
app.get('/', (_,res)=> res.sendFile(path.join(__dirname, '..', 'public', 'index.html')));
app.get('/health', async (_,res)=> res.json({ ok:true, server_time: await getNetworkTime() }));
app.get('/status', async (_,res)=> {
  res.json({ ok:true, mode: process.env.MODE || 'normal', brokers: brokerManager.getActiveAdapters() });
});

// debug test endpoint — only allowed when ALLOW_TEST=true
app.post('/debug/force-test', express.json(), async (req,res) => {
  if(process.env.ALLOW_TEST !== 'true') return res.status(403).json({ ok:false, message:'test disabled' });
  const sig = req.body.signal || {
    pair: 'EUR/USD', direction: 'CALL', confidence: 90, entry: 1.0953,
    sl: 1.0940, tp: 1.0975, entry_ts: Math.floor(Date.now()/1000),
    expiry_ts: Math.floor(Date.now()/1000) + 60, mode: 'normal', notes: 'debug'
  };
  try{
    // broadcast: dashboard + telegram + backup
    await backupSignal(sig);
    await send(formatSignal(sig));
    res.json({ ok:true, sent:true });
  }catch(e){
    res.status(500).json({ ok:false, err: e.message });
  }
});

const server = http.createServer(app);
attachDashboard(server);

server.listen(PORT, async ()=> {
  info(`Quantum Apex System listening on port ${PORT}`);
  try{
    await brokerManager.init();
    if(process.env.AUTO_START === 'true'){
      // start engine
      start().catch(e => warn('engine start error: ' + e.message));
    } else info('AUTO_START disabled — engine not started');
  }catch(e){
    warn('server init error: ' + e.message);
  }
});
