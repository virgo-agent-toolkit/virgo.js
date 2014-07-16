var virgo = require('..');

var agent = virgo.agent;
var endpoint = virgo.endpoint;
var heartbeats = virgo.heartbeats;

endpoint([heartbeats(function(hb) {
  process.stdout.write('received hb\n');
  process.stdout.write(JSON.stringify(hb, 0, 2) + '\n');
})]).run();

agent([heartbeats()]).run();
