var test = require('tape');
var virgo = require('..');
var async = require('async');

var agent = virgo.agent,
    endpoint = virgo.endpoint,
    heartbeats = virgo.heartbeats,
    portOption = {"port": 8443},
    tEndpoint, tAgent;

test('send and receive heartbeats test', function(t) {
  var hbCounter = -1,
      lastHb = null;

  tEndpoint = endpoint([heartbeats(function(hb) {
    hbCounter = hbCounter + 1;
    lastHb = hb;
  })], portOption);
  tEndpoint.run();
  
  tAgent = agent([heartbeats()], portOption);
  tAgent.run();

  setTimeout(
    function() {
      t.equal(hbCounter, lastHb.id, "heartbeat counter should equal latest heartbeat id");
      t.end();
    }, 2000);
});

test('shutdown heartbeats test', function(t) {
  t.equal(tAgent.features[0].hb_timer._idleTimeout, 1000, 'Heartbeat timer should be set before agent shutdown');
  
  async.series([
    function shutdownAgent(callback) {
      tAgent.shutdown(function() {
        t.equal(tAgent.features[0].hb_timer._idleTimeout, -1, 'Heartbeat timer shouldn\'t be set after agent shutdown');
        callback();
      });
    },

    function shutdownEndpoint(callback) {
      tEndpoint.shutdown(callback);
    }
  ], function(err, callback) {
    t.notOk(err, 'Shutdown should succeed');
    t.end();
  });
});
