var logmagic = require('logmagic');

logmagic.route("virgojs.*", logmagic.DEBUG, "graylog2-stderr");

module.exports = {
  'agent': require('./lib/agent'),
  'endpoint': require('./lib/endpoint'),
  'Connection': require('./lib/Connection'),
  'heartbeats': require('./lib/heartbeats')
};
