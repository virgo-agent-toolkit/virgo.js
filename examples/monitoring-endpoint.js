var logmagic = require('logmagic');

logmagic.route('__root__', logmagic.DEBUG, "console");

var virgo = require('..');

// Hello, world example feature
var monitoring = require('./monitoring-feature');

// Create agent and endpoint
var agent = virgo.agent;
var endpoint = virgo.endpoint;

// Use an unprivileged port to avoid having to run the example with sudo.
// If not provided, port will default to 443.
var portOption = {"port": 54434};

// The endpoint will run this function when it receives a message from an agent.
endpoint([monitoring('endpoint')], portOption).run();
