var virgo = require('..');

// Hello, world example feature
var helloworld = require('./hello-world-feature');

// Create agent and endpoint
var agent = virgo.agent;
var endpoint = virgo.endpoint;

// Use an unprivileged port to avoid having to run the example with sudo.
// If not provided, port will default to 443.
var portOption = {"port": 8443};

// The endpoint will run this function when it receives a message from an agent.
endpoint([helloworld('endpoint')], portOption).run();

// The agent will send a Hello, world! message to the endpoint.
agent([helloworld('agent')], portOption).run();
