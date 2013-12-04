var util = require('util');

/**
 *  * The base RPC Message.
 *   * @constructor
 *    */
function Message() {
  this.id = null;
  this.target = null;
  this.source = null;
}

/**
 * A Request RPC message.
 * @constructor
 * @extends {Message}
 * @param {String} method Method name to invoke on the peer.
 * @param {Object?} params Optional parameters.
 */
function Request(method, params) {
  Request.super_.call(this);
  this.method = method;
  this.params = params || {};
}
util.inherits(Request, Message);


/** Export Request */
exports.Request = Request;


/**
 * Convert a message into its serialized form.
 * @param {String} msgId Opaque message ID to serialize message to.
 * @return {Object} Message with all fields realized.
 */
Request.prototype.serialize = function(msgId) {
  this.id = msgId;

  return {v: '1',
    id: this.id,
    target: this.target,
    source: this.source,
    method: this.method,
    params: this.params};
};


/**
 * A Response RPC message.
 * @constructor
 * @extends {Message}
 * @param {Object} request Message we are replying to.
 * @param {?Object} result Result object.
 * @param {?Object} error Error object.
 */
function Response(request, result, error) {
  Response.super_.call(this);
  if (request) {
    this.id = request.id;
    this.target = request.source;
    this.source = request.target;
  }
  this.result = result || null;
  this.error = error || null;
}

util.inherits(Response, Message);


/** Export Response */
exports.Response = Response;


/**
 * Convert a message into its serialized form.
 * @return {Object} Message with all fields realized.
 */
Response.prototype.serialize = function() {
  return {v: '1',
    id: this.id,
    target: this.target,
    source: this.source,
    error: this.error,
    result: this.result};
};


/**
 * Request a Handshake Hello.
 * @extends {Request}
 * @constructor
 */
function HandshakeHello(agentId, token, process_version, bundle_version, agent_name) {
  HandshakeHello.super_.call(this, 'handshake.hello');
  this.token = agentId;
  this.agent_id = token;
  this.process_version = process_version;
  this.bundle_version = bundle_version;
  this.agent_name = agent_name;
}
util.inherits(HandshakeHello, Request);


/** Export HandshakeHello */
exports.HandshakeHello = HandshakeHello;


/**
 * Convert a message into its serialized form.
 * @param {String} msgId Opaque message ID to serialize message to.
 * @return {Object} Message with all fields realized.
 */
HandshakeHello.prototype.serialize = function(msgId) {
  this.params.token = this.token;
  this.params.agent_id = this.agent_id;
  this.params.process_version = this.process_version;
  this.params.bundle_version = this.bundle_version;
  this.params.agent_name = this.agent_name;
  return HandshakeHello.super_.prototype.serialize.call(this, msgId);
};


/**
 *  * A heart_beat.post request.
 *   * @extends {Request}
 *    * @constructor
 *     */
function Heartbeat(timestamp) {
  Heartbeat.super_.call(this, 'heartbeat.post');
  this.timestamp = timestamp;
}
util.inherits(Heartbeat, Request);


/** Export Heartbeat */
exports.Heartbeat = Heartbeat;


/**
 *  * Convert a message into its serialized form.
 *   * @param {String} msgId Opaque message ID to serialize message to.
 *    * @return {Object} Message with all fields realized.
 *     */
Heartbeat.prototype.serialize = function(msgId) {
    this.params.timestamp = this.timestamp;
    return Heartbeat.super_.prototype.serialize.call(this, msgId);
};
