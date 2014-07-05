var stream = require('stream');

// merge_into handles the logic that all connections' inputs are merged into a
// single stream.
exports.merge_into = function(from, to) {
  var merger = new stream.Writable({objectMode: true});
  merger._write = function(data, encoding, callback) {
    to.write(data, encoding, callback);
  };
  from.pipe(merger);
}
