var stream = require('stream');
var util = require('util');
var async = require('async');

// FanOut is a writable stream that carbon copy everything written into this
// stream to all consumers (created from new_consumer() method). It considers
// combined backpressure across all consumers.
function FanOut(options) {
  stream.Writable.call(this, options);

  this.options = options;
  this.consumers = [];
}
util.inherits(FanOut, stream.Writable)

FanOut.prototype._write = function(data, encoding, callback) {
  async.forEach(this.consumers, function(c, callback) {
    c.write(data, encoding, callback);
  }, callback); // call callback when all consumer has called callback
};

// return a "consumer" stream object that can be piped into other streams
FanOut.prototype.new_consumer = function() {
  var ret = new stream.PassThrough(this.options);
  this.consumers.push(ret);
  return ret;
};

exports = module.exports = FanOut;
