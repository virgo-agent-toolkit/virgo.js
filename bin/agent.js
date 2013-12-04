var Stream = require('../lib/stream').Stream;
var winston = require('winston');
var fs = require('fs');

// Setup Logger

var logger = new (winston.Logger)({
  transports: [
    new (winston.transports.Console)()
  ]
});

logger.setLevels(winston.config.syslog.levels);

// Parse Credentials

var creds = fs.readFileSync('creds.json');

try {
  creds = JSON.parse(creds);
} catch (e) {
  logger.error('Credential file failed to parse : ' + e.message);
  process.exit(1);
}

// Setup Options

var options = {
  endpoints: [
    '_monitoringagent._tcp.dfw1.prod.monitoring.api.rackspacecloud.com',
    '_monitoringagent._tcp.ord1.prod.monitoring.api.rackspacecloud.com',
    '_monitoringagent._tcp.lon3.prod.monitoring.api.rackspacecloud.com'
  ],
  log: logger,
  ca: [ fs.readFileSync('maas.cert') ],
  token: creds.token,
  agent_id: creds.agent_id,
  guid: '986783af-22ba-4fd0-8615-7b326c61153d',
  process_version: '0.1.2',
  bundle_version: '0.1.2'
};

s = new Stream(options);
s.connect();
