var util = require('util');
var tls = require('tls');
var dns = require('dns');
var stream = require('stream');
var _ = require('underscore');
var through = require('through');
var logmagic = require('logmagic');
var pjson = require('../package.json');
var os = require('os');

var CXN_STATES = {
  INITIAL: 'INITIAL',
  RESOLVED: 'RESOLVED',
  CONNECTED: 'CONNECTED',
  READY: 'READY',
  AUTHENTICATED: 'AUTHENTICATED',
  ERROR: 'ERROR',
  CLOSED: 'CLOSED'
};

function Connection(manifest, options) {
  stream.Duplex.call(this, {objectMode: true});

  // local manifest
  this.manifest = manifest;

  // remote manifest
  this.remote = null;

  this.options = options || {};
  this.token = options.agent_token || '';

  // optional handshake parameter configuration
  this.source = options.source || os.hostname() + '-' + process.pid;
  this.agent_id = options.agent_id || os.hostname();
  this.agent_name = options.agent_name || 'virgo.js';
  this.process_version = options.process_version || pjson.version;

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

  this.log = logmagic.local('connection');

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
  this.log.debug(this._state + ' -> ' + to);
  this._state = to;
  this.emit(to, data);
};

Connection.prototype._error = function(err) {
  this.log.err(err);
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
  var self = this;

  var jsonify = through(function write(o) {
    var data;
    try {
      data = JSON.stringify(o) + '\n';
      self.log.debug('jsonify', {data: data});
    } catch (e) {
      data = null;
      self.log.error('jsonify error', {err: e.message});
    }
    this.queue(data);
  });
  var dejsonify = through(function(j) {
    try {
      var data, str;
      if (typeof j === 'string') {
        str = j;
        data = JSON.parse(str);
      } else {
        str = j.toString();
        data = JSON.parse(str);
      }
      self.log.debug('dejsonify', {data: str});
    } catch (e) {
      data = null;
      self.log.error('dejsonify error', {err: e.message});
    }
    this.queue(data);
  });
  this.readable = this.connection.pipe(dejsonify);
  this.writable = jsonify;
  this.writable.pipe(this.connection);
  this._changeState(CXN_STATES.READY);
};

// client (agent) and server (endpoint) handshake and exchange manifest data.
Connection.prototype._handshake = function() {
  var self = this, msg;

  if (this._is_server) {
    msg = self._handshakeMessageResponse();
    var onDataServer = function(data) {
      if (data.method === 'handshake.hello') {
        self.log = logmagic.local('connection.' + data.params.agent_id);
        self.readable.removeListener('data', onDataServer);

        msg.target = data.source;
        msg.source = data.target;
        self.agent_id = data.params.agent_id;
        self.remote = data.manifest;
        self.writable.write(msg);
        self._changeState(CXN_STATES.AUTHENTICATED);
      }
    };
    // using on() instead of once() and let the handler removes itself because
    // incoming message might be non-handshake messages.
    this.readable.on('data', onDataServer);
  } else {
    msg = self._handshakeMessageRequest();
    var onDataClient = function(data) {
      if (data.id == msg.id && data.source == msg.target && data.target == msg.source) {
        if (data.v != msg.v) {
          self._error('Version mismatch: message version and response version do not match');
          return;
        } else if (data.error) {
          self._error(data.error);
          return;
        }
        self.remote = data.manifest;
        self.readable.removeListener('data', onDataClient);
        self._changeState(CXN_STATES.AUTHENTICATED);
      }
    };
    // using on() instead of once() and let the handler removes itself because
    // incoming message might be non-handshake messages.
    this.readable.on('data', onDataClient);
    this.writable.write(msg);
  }
};

Connection.prototype._handshakeMessageResponse = function() {
  return {
    'v': '1',
    'id': 0,
    'target': 'endpoint',
    'source': this.source,
    'manifest': this.manifest,
    'method': 'handshake.hello',
    'result': { heartbeat_interval: 10000 }
  };
};

Connection.prototype._handshakeMessageRequest = function() {
  return {
    'v': '1',
    'id': 0,
    'target': 'endpoint',
    'source': this.source,
    'manifest': this.manifest,
    'method': 'handshake.hello',
    'params': {
      'agent_id': this.agent_id,
      'agent_name': this.agent_name,
      'process_version': this.process_version, 
      'bundle_version': 'n/a' // deprecation incoming
    }
  };
};

Connection.prototype.pipe = function(dest, pipeOpts) {
  return this.readable.pipe(dest, pipeOpts);
};

Connection.prototype._read = function(n) {
  return this.readable._read(n);
};

Connection.prototype._write = function(obj, encoding, callback) {
  // since it's the Connection rather than this.writable that is piped into from
  // upstream stream, we call write() instead of _write() here.
  obj.source = this.source;
  this.writable.write(obj, encoding);
  callback();
};

Connection.prototype.close = function(callback) {
  this._changeState(CXN_STATES.CLOSED);
  
  if (this.connection.socket) {
    this.connection.socket.destroy();
  } else {
    this.connection._handle.close();
  }

  callback();
};

exports = module.exports = Connection;
