var events = require('events');
var sys = require('sys');
var tls = require('tls');

var Protocol = require('./protocol').Protocol;

function Client(options, stream) {
  events.EventEmitter.call(this);
  this.options = options;
  this.stream = stream;
  this.protocol = null;
  this.sock = null;
}
sys.inherits(Client, events.EventEmitter);


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

exports.Client = Client;
