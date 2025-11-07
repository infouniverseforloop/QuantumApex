// backend/mongoClient.js
const { MongoClient } = require('mongodb');
const { info, warn } = require('./logger');

let client = null;
let db = null;

async function initMongo(){
  const uri = process.env.MONGO_URI || '';
  const dbName = process.env.MONGO_DB_NAME || 'quantumapex';
  if(!uri) {
    warn('MONGO_URI not set — MongoDB disabled');
    return null;
  }
  client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
  await client.connect();
  db = client.db(dbName);
  info('MongoDB connected');
  return db;
}

function getDb(){ return db; }

async function closeMongo(){ if(client) await client.close(); }

module.exports = { initMongo, getDb, closeMongo };
