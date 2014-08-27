var stream = require('stream');

// HelloWorld is a very basic feature example that
// sends and receives "Hello, world!"
exports = module.exports = function helloworld(role) {
  var hello = new HelloWorld();
  hello.role = role;
  return hello;
}

exports.HelloWorld = HelloWorld;

function HelloWorld() {
  this._metadata = {
    'name': 'HelloWorld',
    'version': '0.1.0'
  }; 
  this.role = null;
}

HelloWorld.prototype.meta = function() { return this._metadata; };

HelloWorld.prototype.init = function(session, callback) {
  var self = this;
  this.session = session;

  if (this.role == 'agent') {
    var broadcastable = session.broadcastable();
    broadcastable.write(this.sendHello());
  } else {
    var sink = new stream.Writable({objectMode: true});
    sink._write = function(data, encoding, callback) {
      if (data.method == 'helloworld.post' && data.hasOwnProperty('params')) {
        self.receiveHello(data.params.msg);
      }
      callback();
    };
    var readable = session.readable();
    readable.pipe(sink);
  } 
  callback();
};

HelloWorld.prototype.sendHello = function() {
  return {
    method: 'helloworld.post',
    params: {
      msg: 'Hello, world!'
    }
  };
};
        
HelloWorld.prototype.receiveHello = function(msg) {
  process.stdout.write(msg + '\n');
};

HelloWorld.prototype.shutdown = function(callback) {
  callback();
};
