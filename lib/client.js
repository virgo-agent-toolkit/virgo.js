var events = require('events');
var sys = require('sys');
var timers = require('timers');
var tls = require('tls');
var logmagic = require('logmagic');
var sprintf = require('sprintf').sprintf;

var Protocol = require('./protocol').Protocol;



function Client(options, stream) {
  events.EventEmitter.call(this);
  this.options = options;
  this.stream = stream;
  this.protocol = null;
  this.sock = null;
  this._log_key = sprintf('client[%s:%s]', this.options.host,
    this.options.port);
  this.log = logmagic.local(this._log_key);
}
sys.inherits(Client, events.EventEmitter);


Client.prototype.getLog = function() {
  return this.log;
};


Client.prototype.connect = function() {
  var self = this;
  self.sock = tls.connect(self.options, function() {
    self.protocol = new Protocol(self);
    self.protocol.on('message', function(msg) {
      self.emit('message', msg);
    });
    self.emit('connect');
  });
  self.sock.on('end', function() {
    self.emit('end');
  });
  self.sock.on('error', function(err) {
    self.emit('error', err);
  });
};


Client.prototype.startHeartbeat = function(interval) {
  var self = this;
  self.log.debug('starting heartbeat ' + interval);
  self._heartbeatTimer = timers.setInterval(function() {
    self.protocol.sendHeartbeat(Date.now());
  }, interval);
};

exports.Client = Client;
