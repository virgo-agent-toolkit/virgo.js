var util = require('util');
var stream = require('stream');
var tls = require('tls');
var async = require('async');
var log = require('logmagic').local('virgojs.endpoint');

var Connection = require('./connection');
var FanOut = require('./fan_out');
var certs = require('./certs');
var utils = require('./utils');

exports = module.exports = function endpoint(features) {
  var ep = new Endpoint(features);

  return ep;
};

// longterm TODO: worry about binding without TLS

// TODO: factor Endpoint and Agent to base on same super class?

function Endpoint(features) {
  var self = this;
  this.features = features;
  this.manifest = {};
  this._msg_id = 0;
  this.has_consumer = false;
  this.port = 443;

  features.forEach(function(f) {
    var meta = f.meta();
    self.manifest[meta.name] = meta;
  });

  this.connections = {};
  this.tls_options = {
    pfx: certs.server_pfx// TODO: pick name?
  };

  // incoming is a FanOut object. It's to merge input from all connections,
  // then fan out to all features.
  this.incoming = null;
}

Endpoint.prototype.run = function() {
  var self = this;

  // JSON parsing is done in connection so it's all objects here
  self.incoming = new FanOut({objectMode: true});

  this.server = tls.createServer(this.tls_options, function(c) {
    // pass accecpted TLS connection into Connection to trigger server mode
    var conn = new Connection(this.manifest, {connection: c});
    conn.connect(function(err) {
      // track connections through agent ID
      self.connections[conn.remote.agent_id] = conn;
      // merge c into self.incoming
      utils.merge_into(conn, self.incoming);
    });
  });
  this.server.listen(this.port, function() {
    log.info('server bound');
  });

  async.forEach(this.features, function(f, callback) {
    f.init(self, callback); 
  });
};

// returns a readable stream. Each feature holds one of these for reading
// incoming objects.
Endpoint.prototype.readable = function() {
  return this.incoming.new_consumer();
};

// returns a writable stream. Each feature holds one of these for writing
// objects out. Objects written into this stream will be sent on a single
// connection, chosen by _choose_connection method.
Endpoint.prototype.writable = function() {
  var writable = stream.Writable({objectMode: true});
  var self = this;
  writable.prototype._write = function(data, encoding, callback) {
    var conn = self._choose_connection(data);
    if (conn) {
      conn.write(data, encoding, callback);
    }
  };
  return writable;
};

Endpoint.prototype._choose_connection = function(data) {
  // choose the correct connection based on agent ID
  return self.connections[data.destination.id];
};

Endpoint.prototype.shutdown = function(callback) {
  async.forEach(this.features, function(f, callback) {
    f.shutdown(callback);
  }, callback);
};

Endpoint.prototype.msg_id = function() {
  return this._msg_id++;
};
