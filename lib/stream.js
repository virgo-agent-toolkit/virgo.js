var _ = require('underscore');
var async = require('async');
var dns = require('dns');
var events = require('events');
var logmagic = require('logmagic');
var sys = require('sys');

var Client = require('./client').Client;


function Stream(options) {
  events.EventEmitter.call(this);
  this.options = options;
  this._unauthedClients = {};
  this._authedClients = {};
  this.log = logmagic.local('stream');
}
sys.inherits(Stream, events.EventEmitter);

Stream.prototype.getLog = function() {
  return this.log;
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

Stream.prototype._register = function(client) {
  this._unauthedClients[client.sock.socket.localPort] = client;
};

Stream.prototype._promote = function(client) {
  this.log.info('client promoted', _.pick(client.options, 'host', 'port'));
  delete this._unauthedClients[client.sock.socket.localPort];
  this._authedClients[client.sock.socket.localPort] = client;
};

Stream.prototype._createClient = function(endpoint) {
  var self = this;

  dns.resolveSrv(endpoint, function(err, record) {
    if (err) {
      self.log.error(err);
      return;
    }

    var options = _.extend({
      host: record[0].name,
      port: record[0].port
    }, self.options);

    var client = new Client(options, self);
    client.on('error', function(err) {
      self.log.error(err.message);
    });
    client.on('connect', function() {
      self.log.info('client connected', _.pick(options, 'host', 'port'));
      client.protocol.startHandshake(self.getAgentId(),
                                     self.getToken(),
                                     self.getProcessVersion(),
                                     self.getBundleVersion());
      self._register(client);
      client.protocol.on('promoted', function(msg) {
        self._promote(client);
        client.startHeartbeat(msg.result.heartbeat_interval);
      });
    });
    client.connect();
  });
};


Stream.prototype.connect = function() {
  async.forEach(this.options.endpoints, this._createClient.bind(this));
};


exports.Stream = Stream;
