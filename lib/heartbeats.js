var timers = require('timers');
var stream = require('stream');

// Heartbeats should either be in receive mode or send mode
// receive mode calls a callback when the heartbeat is received
// send mode has a heartbeat timer
exports = module.exports = function heartbeats(callback) {
  var hb = new Heartbeats();
  if (callback) {
    hb.receive(callback);
  }
  return hb;
};

exports.Heartbeats = Heartbeats;

function Heartbeats() {
  this._metadata = {
    'name': 'Heartbeats',
    'version': '0.1.0'
  }; 

  this.hb_db = null;
  this.hb_timer = null;
}

Heartbeats.prototype.meta = function() { return this._metadata; };

Heartbeats.prototype.receive = function(callback) { this.hb_cb = callback; };

Heartbeats.prototype.init = function(session, callback) {
  var self = this;
  this.session = session;

  if (this.hb_cb) { // receive mode    
    var sink = new stream.Writable({objectMode: true});
    sink._write = function(data, encoding, callback) {
      if (data.method === 'heartbeat.post') {
        self.hb_cb(data);
      }
      callback();
    };
    var readable = session.readable();
    readable.pipe(sink);
  } else { // send mode, set up a timer
    var broadcastable = session.broadcastable();
    this.hb_timer = timers.setInterval(function() {
      broadcastable.write(self.heartbeat()); // the Session must be writeable ?
    }, 1000); // TODO: config? how should configurations be represented? opts everywhere?
  }
  callback();
};

Heartbeats.prototype.heartbeat = function() {
  return {
    v: this.meta().version,
    target: 'heartbeats', // where should the target come from? should it only send if it is supported? should the connection filter that?
    source: this._metadata.name,
    method: 'heartbeat.post',
    params: {
      timestamp: new Date().getTime()
    }
  };
};

Heartbeats.prototype.shutdown = function(callback) {
  if (this.hb_timer) {
    timers.clearTimeout(this.hb_timer);
  }
  callback();
};
