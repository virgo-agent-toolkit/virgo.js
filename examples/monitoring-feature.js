var stream = require('stream');

// Monitoring is a very basic feature example that
// sends and receives "Hello, world!"
exports = module.exports = function monitoring(role) {
  var hello = new Monitoring();
  hello.role = role;
  return hello;
}

exports.Monitoring = Monitoring;

function Monitoring() {
  this._metadata = {
    'name': 'Monitoring',
    'version': '0.1.0'
  }; 
  this.role = null;
}

Monitoring.prototype.meta = function() { return this._metadata; };

Monitoring.prototype.init = function(session, callback) {
  var self = this;
  this.session = session;

  if (this.role == 'agent') {
    var broadcastable = session.broadcastable();
    broadcastable.write(this.sendCheckMetrics());
  } else {
    var sink = new stream.Writable({objectMode: true});
    sink._write = function(data, encoding, callback) {
      if (data.method == 'check_metrics.post' && data.hasOwnProperty('params')) {
        self.receiveCheckMetrics(data.params.msg);
      }
      callback();
    };
    var readable = session.readable();
    readable.pipe(sink);
  } 
  callback();
};

Monitoring.prototype.sendCheckMetrics = function() {
  return {
    method: 'check_metrics.post',
    params: {
      msg: ''
    }
  };
};
        
Monitoring.prototype.receiveCheckMetrics   = function(msg) {
  process.stdout.write(msg + '\n');
};

Monitoring.prototype.shutdown = function(callback) {
  callback();
};
