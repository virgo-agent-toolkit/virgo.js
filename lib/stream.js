var async = require('async');
var dns = require('dns');
var events = require('events');
var sys = require('sys');
var _ = require('underscore');

var Client = require('./client').Client;


function Stream(options) {
  var self = this;
  events.EventEmitter.call(self);
  self.options = options;
  self._log = options.log;
  self._unauthedClients = {};
  self._authedClients = {};
}
sys.inherits(Stream, events.EventEmitter);


Stream.prototype.getLog = function() {
  return this._log;
};


Stream.prototype.getAgentId = function() {
  return this.options.agent_id || 'NO_AGENTID';
};

Stream.prototype.getGuid = function() {
  return this.options.guid || 'NO_GUID';
};

Stream.prototype.getToken = function() {
  return this.options.token || 'NO_TOKEN';
};

Stream.prototype.getProcessVersion = function() {
  return this.options.process_version;
};

Stream.prototype.getBundleVersion = function() {
  return this.options.bundle_version;
};


Stream.prototype._createClient = function(endpoint) {
  var self = this;

  dns.resolveSrv(endpoint, function(err, record) {
    if (err) {
      self._log.error(err);
      return;
    }

    var options = _.extend({
      host: record[0].name,
      port: record[0].port
    }, self.options);

    var client = new Client(options, self);
    client.on('error', function(err) {
      self._log.error(err.message);
    });
    client.on('connect', function() {
      self._log.info('client connected', {host: options.host, port: options.port});
      self._unauthedClients[client.sock.socket.localPort] = client;
      client.protocol.startHandshake(self.getAgentId(),
                                     self.getToken(),
                                     self.getProcessVersion(),
                                     self.getBundleVersion());
      client.protocol.on('promoted', function() {
        self._log.info('client promoted', {host: options.host, port: options.port});
        delete self._unauthedClients[client.sock.socket.localPort];
        self._authedClients[client.sock.socket.localPort] = client;
      });
    });
    client.connect();
  });
};


Stream.prototype.connect = function() {
  async.forEach(this.options.endpoints, this._createClient.bind(this));
};


exports.Stream = Stream;
