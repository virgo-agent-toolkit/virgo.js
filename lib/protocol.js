var assert = require('assert');
var events = require('events');
var sys = require('sys');
var msg = require('./messages');
var sprintf = require('sprintf').sprintf;
var LineEmitter = require('line-emitter').LineEmitter;

var HANDSHAKE_TIMEOUT = 5000;

var requests = {};

requests['handshake.hello'] = function(self, agentId, token, processVersion, bundleVersion, callback) {
  var m = new msg.HandshakeHello(token, agentId, processVersion, bundleVersion);
  self.send(m, callback, HANDSHAKE_TIMEOUT);
};

function Protocol(client) {
  var self = this;
  events.EventEmitter.call(self);

  self._msgid = 0;

  self.requests = requests;
  self.client = client;
  self.completions = {};

  self.le = new LineEmitter();
  self.le.on('data', self._onMessage.bind(self));
  client.sock.on('data', function(data) {
    self.le.write(data);
  });
}
sys.inherits(Protocol, events.EventEmitter);


Protocol.prototype._processMessage = function(msg) {
  var key = this._completionKey(msg.source, msg.id),
      callback = this.completions[key];

  if (callback) {
    delete this.completions[key];
    callback(null, msg);
  }
};


Protocol.prototype._onMessage = function(line) {
  var msg;

  this.client.stream.getLog().debug(sprintf('RECV: => %s', line));
  
  try {
    msg = JSON.parse(line);
  } catch (e) {
    this.client.stream.getLog().error('INVALID MESSAGE');
    return;
  }

  this._processMessage(msg);
};


Protocol.prototype._completionKey = function() {
  var args = arguments;
  assert(args.length === 2);
  return args[0] + ':' + args[1];
};


Protocol.prototype.send = function(msg, callback, timeout) {
  msg = msg.serialize(this._msgid);
  msg.target = 'endpoint';
  msg.source = this.client.stream.options.guid;

  var msg_str = JSON.stringify(msg);
  var data = msg_str + '\n';
  var key = this._completionKey(msg.target, msg.id);

  this.completions[key] = callback;
  this.client.stream.getLog().debug(sprintf('SENDING: (%s) => %s', key, msg_str));
  this.client.sock.write(data);
};


Protocol.prototype.startHandshake = function(agent_id, token, processVersion, bundleVersion, callback) {
  var self = this,
      callback = callback || function() {};
  this.requests['handshake.hello'](this, agent_id, token, processVersion, bundleVersion, function(err, msg) {
    if (err) {
      callback(err);
      return;
    }
    self.emit('promoted');
    callback(null, msg);
  });
};


exports.Protocol = Protocol;
