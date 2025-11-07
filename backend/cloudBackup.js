// backend/cloudBackup.js
const axios = require('axios');
const fs = require('fs');
const { info, warn, err } = require('./logger');

const FIREBASE_DB_URL = (process.env.FIREBASE_DB_URL || '').replace(/\/$/,'');
const LOCAL_BACKUP = './data/backup_signals.json';

function ensureData(){ if(!fs.existsSync('./data')) fs.mkdirSync('./data'); }

async function pushToFirebase(node, payload){
  if(!FIREBASE_DB_URL) throw new Error('FIREBASE_DB_URL not configured');
  const url = `${FIREBASE_DB_URL}/${node}.json`;
  await axios.post(url, payload, { timeout: 10000 });
}

function saveLocal(node, payload){
  try{
    ensureData();
    const arr = fs.existsSync(LOCAL_BACKUP) ? JSON.parse(fs.readFileSync(LOCAL_BACKUP)) : [];
    arr.push({ node, payload, t: new Date().toISOString() });
    fs.writeFileSync(LOCAL_BACKUP, JSON.stringify(arr, null, 2));
    info('Saved backup locally');
  }catch(e){ warn('saveLocal failed: ' + e.message); }
}

async function backupSignal(payload){
  try{
    if(!payload) throw new Error('no payload');
    if(FIREBASE_DB_URL){
      await pushToFirebase('signals', payload);
      info('Backed up to Firebase');
    } else {
      saveLocal('signals', payload);
    }
  }catch(e){
    warn('backupSignal failed: ' + e.message);
    try{ saveLocal('signals', payload); }catch(e2){}
  }
}

module.exports = { backupSignal };
