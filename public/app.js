// public/app.js
const serverTimeEl = document.getElementById('serverTime');
const activeEl = document.getElementById('active');
const statsEl = document.getElementById('stats');
const historyEl = document.getElementById('history');

const wsUrl = (location.protocol === 'https:' ? 'wss:' : 'ws:') + '//' + location.host + '/dash-ws';
const ws = new WebSocket(wsUrl);

let history = [];
let stats = { signals:0, wins:0, losses:0 };

ws.onopen = () => console.log('Dashboard WS connected', wsUrl);
ws.onmessage = (evt) => {
  try{
    const msg = JSON.parse(evt.data);
    if(msg.type === 'hello') serverTimeEl.innerText = `Server: ${msg.server_time || '-'}`;
    else if(msg.type === 'signal'){ showActive(msg.data); addHistory({ type:'signal', ...msg.data }); stats.signals++; renderStats(); }
    else if(msg.type === 'result'){ addHistory({ type:'result', ...msg.data }); if(msg.data.result === 'WIN') stats.wins++; else stats.losses++; renderStats(); }
  }catch(e){ console.warn('dash parse err', e); }
};

function showActive(s){
  const when = new Date((s.entry_ts||Math.floor(Date.now()/1000))*1000).toLocaleTimeString();
  activeEl.innerHTML = `<div><strong>${s.pair}</strong> — ${s.direction} (conf ${s.confidence}%)</div>
    <div>Entry: ${s.entry} at ${when}</div>
    <div>SL: ${s.sl || '-'} | TP: ${s.tp || '-'}</div>
    <div>Notes: ${s.notes || '-'}</div>`;
}

function addHistory(item){
  history.unshift(item);
  if(history.length > 50) history.pop();
  renderHistory();
}

function renderHistory(){
  historyEl.innerHTML = '';
  history.forEach(h => {
    const li = document.createElement('li');
    if(h.type === 'signal') li.innerHTML = `<b>[SIG]</b> ${h.pair} ${h.direction} conf:${h.confidence}%`;
    else li.innerHTML = `<b>[RES]</b> ${h.pair} ${h.result} final:${h.finalPrice || '-'}`;
    historyEl.appendChild(li);
  });
}

function renderStats(){ statsEl.innerHTML = `Signals: ${stats.signals} • Wins: ${stats.wins} • Losses: ${stats.losses}`; }
