var test = require('tape');
var virgo = require('..');
var async = require('async');

var agent = virgo.agent,
    endpoint = virgo.endpoint,
    heartbeats = virgo.heartbeats,
    endpointOption = {"host": 'localhost', "port": 8443};

test('send and receive heartbeats test', function(t) {
  var hbCounter = -1,
      lastHb = null,
      tEndpoint, tAgent;

  tEndpoint = endpoint([heartbeats(function(hb) {
    hbCounter = hbCounter + 1;
    lastHb = hb;
  })], endpointOption);
  tEndpoint.run();
  
  tAgent = agent([heartbeats()], endpointOption);
  tAgent.run();

  async.series([
    function timeoutHeartbeat(callback) {
      setTimeout(function() {
        t.equal(hbCounter, lastHb.id, "heartbeat counter should equal latest heartbeat id.");
        callback();
      }, 2000);
    },

    function shutdownEndpoint(callback) {
      tEndpoint.shutdown(callback);
    },

    function shutdownAgent(callback) {
      tAgent.shutdown(callback);
    }
  ], function(err) {
    t.end();
  });
});

test('shutdown heartbeats test', function(t) {
  var tEndpoint, tAgent;
  
  tEndpoint = endpoint([heartbeats(function(hb) {
    process.stdout.write(hb);
  })], endpointOption);
  tEndpoint.run();
  
  tAgent = agent([heartbeats()], endpointOption);
  tAgent.run();

  async.series([
    function setupAgentTimeout(callback) {
      setTimeout(function() {
        callback();
      }, 2000);
    },

    function testAgentShutdown(callback) {
      t.equal(tAgent.features[0].hb_timer._idleTimeout, 1000, 'Heartbeat timer should be set before agent shutdown.');
      tAgent.shutdown(function() {
        t.equal(tAgent.features[0].hb_timer._idleTimeout, -1, 'Heartbeat timer shouldn\'t be set after agent shutdown.');
        callback();
      });
    },

    function testEndpointShutdown(callback) {
      t.notEqual(tEndpoint.server._handle.fd, -1, 'Endpoint server should have handle before endpoint shutdown.');
      tEndpoint.shutdown(function() {
        t.equal(tEndpoint.server._handle.fd, -1, 'Endpoint server should not have handle after endpoint shutdown.');
        callback();
      });
    },
  ], function(err, callback) {
    t.notOk(err, 'Shutdown should succeed without errors.');
    t.end();
  });
});
