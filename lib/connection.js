var util = require('util');
var tls = require('tls');
var dns = require('dns');
var stream = require('stream');
var _ = require('underscore');
var through = require('through');
var log = require('logmagic').local('virgojs.connection');

var CXN_STATES = {
  INITIAL: 'INITIAL',
  RESOLVED: 'RESOLVED',
  CONNECTED: 'CONNECTED',
  READY: 'READY',
  AUTHENTICATED: 'AUTHENTICATED',
  ERROR: 'ERROR',
};

function Connection(manifest, options) {
  stream.Duplex.call(this, {objectMode: true});

  // local manifest
  this.manifest = manifest;

  // remote manifest
  this.remote = null;

  this.options = options || {};

  // This means different behaviors on initiating the connection and during the
  // handshake. Client initiates connection while server listens; clients
  // initiates handshake while server responds.
  this._is_server = false;

  this.connection = this.options.connection || null;
  if (this.connection === null) { // client (agent) mode
    if (typeof options.endpoint === 'object') {
      this.host = options.endpoint.host || null;
      this.port = options.endpoint.port || 443;
    } else if (typeof options.endpoint === 'string') {
      this.endpoint = options.endpoint;
    } else {
      assert(false); // TODO
    }

    this.ca = options.ca || null;
    this.key = options.key || null;

    if (this.host !== null) {
      this._state = CXN_STATES.RESOLVED;
    } else {
      // no host provided; need to resolve SRV.
      this._state = CXN_STATES.INITIAL;
    }

  } else { // underlying tls connection provided; server mode
    this._is_server = true;
    this._state = CXN_STATES.CONNECTED;
  }

  // state machine chaining
  this.once(CXN_STATES.INITIAL, this._resolve.bind(this));
  this.once(CXN_STATES.RESOLVED, this._connect.bind(this));
  this.once(CXN_STATES.CONNECTED, this._ready.bind(this));
  this.once(CXN_STATES.READY, this._handshake.bind(this));

}
util.inherits(Connection, stream.Duplex);

// triggers the state machine to start
Connection.prototype.connect = function(callback) {
  this.once(CXN_STATES.AUTHENTICATED, callback);
  this.once(CXN_STATES.ERROR, callback);

  this.emit(this._state);
};

Connection.prototype._changeState = function(to, data) {
  this._state = to;
  log.debug('->' + to);
  this.emit(to, data);
};

Connection.prototype._error = function(err) {
  log.err(err);
  this._changeState(CXN_STATES.ERROR, err);
};

// resolve SRV record
Connection.prototype._resolve = function() {
  var self = this;
  dns.resolveSrv(this.endpoint, function(err, host) {
    if (err) {
      self._error(err);
      return;
    }
    self.host = host[0].name;
    self.port = host[0].port;
    self._changeState(CXN_STATES.RESOLVED);
  });
};

// initiate TLS connection
Connection.prototype._connect = function() {
  var self = this;
  this.connection = tls.connect(_.pick(this, 'host', 'port', 'ca', 'key'), function(err) {
    if (err) {
      self._error(err);
      return;
    }
    self._changeState(CXN_STATES.CONNECTED);
  });
};

// construct JSON parser/encoding on top of the TLS connection
Connection.prototype._ready = function() {
  var 
    jsonify = through(function write(o) {
      try {
        this.queue(JSON.stringify(o) + '\n');
      } catch (e) {
        log.err(e);
        this.queue(null); // todo emit 'error'?
      }
    }),
    dejsonify = through(function(j) {
      try {
        if (typeof j === 'string') {
          this.queue(JSON.parse(j));
        } else {
          this.queue(JSON.parse(j.toString()));
        }
      } catch (e) {
        log.err(e);
        this.queue(null);
      }
    });
  this.readable = this.connection.pipe(dejsonify);
  this.writable = jsonify;
  this.writable.pipe(this.connection);
  this._changeState(CXN_STATES.READY);
};

// client (agent) and server (endpoint) handshake and exchange manifest data.
Connection.prototype._handshake = function() {
  var self = this;
  if (this._is_server) {
    var onDataServer = function(data) {
      if (data.method === 'handshake.post') {
        self.remote = data.manifest;
        // TODO
        if (true) { // if successful
          self.readable.removeListener('data', onDataServer);
          self.writable.write(self._handshakeMessage());
          self._changeState(CXN_STATES.AUTHENTICATED);
        }
      }
    };
    // using on() instead of once() and let the handler removes itself because
    // incoming message might be non-handshake messages.
    this.readable.on('data', onDataServer);
  } else {
    var onDataClient = function(data) {
      if (data.method === 'handshake.post') {
        // TODO
        self.remote = data.manifest;
        if (true) { // if successful
          self.readable.removeListener('data', onDataClient);
          self._changeState(CXN_STATES.AUTHENTICATED);
        }
      }
    };
    // using on() instead of once() and let the handler removes itself because
    // incoming message might be non-handshake messages.
    this.readable.on('data', onDataClient);
    this.writable.write(this._handshakeMessage());
  }
};

Connection.prototype._handshakeMessage = function() {
  return {
    'manifest': this.manifest,
    'method': 'handshake.post',
    // TODO
    // * normal handsake stuff
  };
};

Connection.prototype.pipe = function(dest, pipeOpts) {
  return this.readable.pipe(dest, pipeOpts);
};

Connection.prototype._read = function(n) {
  return this.readable._read(n);
};

Connection.prototype._write = function(chunk, encoding, cb) {
  // since it's the Connecter rather than this.writable that is piped into from
  // upstream stream, we call write() instead of _write() here.
  this.writable.write(chunk, encoding);
  cb();
};

exports = module.exports = Connection;
