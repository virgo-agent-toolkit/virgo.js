var fs = require('fs');
var path = require('path');

exports.server_pfx = function() {
  return fs.readFileSync(path.join(__dirname, '../crypto/server.pfx'));
};
exports.server_cert = function() {
  return fs.readFileSync(path.join(__dirname, '../crypto/server_cert.pem'));
};
exports.client_key = function() {
  return fs.readFileSync(path.join(__dirname, '../crypto/client_key.pem'));
};
