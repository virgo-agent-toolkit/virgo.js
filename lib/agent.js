var async = require('async');
var stream = require('stream');
var fs = require('fs');
var through = require('through');

var Connection = require('./connection');
var FanOut = require('./fan_out');
var certs = require('./certs');
var utils = require('./utils');

exports = module.exports = function agent(features) {
  return new Agent(features);
};

function Agent(features) {
  var self = this;
  this.features = features;
  this.manifest = {};
  this._msg_id = 0;

  features.forEach(function(f) {
    var meta = f.meta();
    self.manifest[meta.name] = meta;
  });  
  
  this.endpoints = [{'host': 'localhost', 'port': 443 }]; 

  // we need to allow the subclass constructor to run 
  // before we create the connection objects
  this.connections = null;

  // incoming is a FanOut object. It's to merge input from all connections,
  // then fan out to all features.
  self.incoming = null;
}

Agent.prototype.run = function() {
  var self = this;

  // JSON parsing is done in connection so it's all objects here
  self.incoming = new FanOut({objectMode: true});

  // map endpoints to connections
  this.connections = this.endpoints.map(function(e) {
    return new Connection(self.manifest, {
      'endpoint': e,
      'key': certs.client_key
      'ca': certs.server_cert
    });
  });  

  // connect the connections
  async.forEach(this.connections, function(c, callback) {
    c.connect(function(err){
      if (!err) {
        // merge c into self.incoming
        utils.merge_into(c, self.incoming);
        callback();
      }
    });
  }, function(err) {
    // initialize features
    async.forEach(self.features, function(f, callback) {
      f.init(self, callback); 
    });
  });
};

// returns a readable stream. Each feature holds one of these for reading
// incoming objects.
Agent.prototype.readable = function() {
  return this.incoming.new_consumer();
};

// returns a writable stream. Each feature holds one of these for writing
// objects out. Objects written into this stream will be sent on a single
// connection, chosen by _choose_connection method.
Agent.prototype.writable = function() {
  var writable = stream.Writable({objectMode: true});
  var self = this;
  writable.prototype._write = function(data, encoding, callback) {
    var conn = self._choose_connection(data);
    conn.write(data, encoding, callback);
  };
  return writable;
};

// returns a writable stream. Each feature holds one of these for writing
// objects out. Objects written into this stream will be sent on all
// connections.
Agent.prototype.broadcastable = function() {
  var writable = new stream.Writable({objectMode: true});
  var self = this;
  writable._write = function(data, encoding, callback) {
    async.forEach(self.connections, function(conn, callback) {
      conn.write(data, encoding, callback);
    }, callback);
  };
  return writable;
};

Agent.prototype._choose_connection = function(data) {
  // always returns the first one for now; later on we should to a geo-match.
  return this.connections[0];
};

Agent.prototype.shutdown = function(callback) {
    async.forEach(this.features, function(f, callback) {
        f.shutdown(callback)
    }, callback);
};

Agent.prototype.msg_id = function() {
  return this._msg_id++
}
