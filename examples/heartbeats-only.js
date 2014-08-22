var virgo = require('..');

// Create agent, endpoint, and a heartbeats feature.
var agent = virgo.agent;
var endpoint = virgo.endpoint;
var heartbeats = virgo.heartbeats;

// Use an unprivileged port to avoid having to run the example with sudo.
// If not provided, port will default to 443.
var portOption = {"port": 8443};

// Create an endpoint with an array of features:
// endpoint([feature 1, feature 2, feature 3...]).run();
//
// Here, a heartbeats feature is called with a callback as an argument. This means
// the heartbeats is in receive mode. When a heartbeat is received, the endpoint will
// run this callback.
endpoint([heartbeats(function(hb) {
  process.stdout.write('received hb\n');
  process.stdout.write(JSON.stringify(hb, 0, 2) + '\n');
})], portOption).run();

// Pass the agent a list of features (again, just one here). We call the heartbeats without a callback, which means the
// heartbeats will be in send mode. In send mode, heartbeats will set up a timer, and a heartbeat will be set at a 
// regular interval.
agent([heartbeats()], portOption).run();
