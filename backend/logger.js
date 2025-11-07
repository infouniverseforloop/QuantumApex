// backend/logger.js
const colors = {
  gray: '\x1b[90m', red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m',
  blue: '\x1b[34m', magenta: '\x1b[35m', cyan: '\x1b[36m', reset: '\x1b[0m'
};
function ts(){ return new Date().toISOString().replace('T',' ').split('.')[0]; }
function info(msg){ console.log(`${colors.cyan}[${ts()}] [INFO]${colors.reset} ${msg}`); }
function ok(msg){ console.log(`${colors.green}[${ts()}] [OK]${colors.reset} ${msg}`); }
function warn(msg){ console.log(`${colors.yellow}[${ts()}] [WARN]${colors.reset} ${msg}`); }
function err(msg){ console.log(`${colors.red}[${ts()}] [ERR]${colors.reset} ${msg}`); }
function dbg(msg){ if(process.env.DEBUG === 'true') console.log(`${colors.gray}[${ts()}] [DBG] ${msg}${colors.reset}`); }
module.exports = { info, ok, warn, err, dbg };
