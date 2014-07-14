var logmagic = require('logmagic');

logmagic.route("virgojs.*", logmagic.DEBUG, "graylog2-stderr")

module.exports = {
  'agent': require('./lib/agent'),
  'endpoint': require('./lib/endpoint'),
  'connection': require('./lib/connection'),
  'heartbeats': require('./lib/heartbeats')
};
