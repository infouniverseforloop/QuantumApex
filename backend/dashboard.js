// backend/dashboard.js
const WebSocket = require('ws');
const { info, dbg } = require('./logger');

let wss = null;

function attachDashboard(server){
  if(wss) return;
  wss = new WebSocket.Server({ server, path: '/dash-ws' });
  wss.on('connection', (ws, req) => {
    const ip = req.socket.remoteAddress;
    info(`Dashboard client connected: ${ip}`);
    ws.send(JSON.stringify({ type:'hello', server_time: new Date().toISOString() }));
    ws.on('message', m => dbg('dash msg: ' + String(m).slice(0,200)));
    ws.on('close', ()=> info(`Dashboard client disconnected: ${ip}`));
  });
  wss.on('listening', ()=> info('Dashboard WS listening on /dash-ws'));
  wss.on('error', e => info('Dashboard WS error: ' + e.message));
}

function broadcast(obj){
  if(!wss) return;
  const raw = JSON.stringify(obj);
  wss.clients.forEach(c => {
    if(c.readyState === WebSocket.OPEN) {
      try { c.send(raw); } catch(e){}
    }
  });
}

module.exports = { attachDashboard, broadcast };
