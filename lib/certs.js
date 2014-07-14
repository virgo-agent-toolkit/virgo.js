var fs = require('fs');
var path = require('path');

exports.server_pfx = fs.readFileSync(path.join(__dirname, '../crypto/server.pfx'));
exports.server_cert = fs.readFileSync(path.join(__dirname, '../crypto/server_cert.pem'));
exports.client_key = fs.readFileSync(path.join(__dirname, '../crypto/client_key.pem'));
