var util = require('util');


function ProtocolError(msg) {
  Error.call(this);
  this.msg = msg;
}
util.inherits(ProtocolError, Error);


exports.ProtocolError = ProtocolError;
