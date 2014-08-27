[![Build Status](https://travis-ci.org/virgo-agent-toolkit/virgo.js.svg?branch=master)](https://travis-ci.org/virgo-agent-toolkit/virgo.js)

[![NPM](https://nodei.co/npm/virgo.js.png)](https://nodei.co/npm/virgo.js)

Virgo.js
========

Virgo.js is a library for creating [Virgo](http://virgo-agent-toolkit.github.io/) agents and agent endpoints in node.js.

    var virgo = require('virgo.js');

Development Setup Instructions
==============================

Clone Virgo.js to obtain a local copy (you could also use the ssh url here). 

    $ git clone https://github.com/virgo-agent-toolkit/virgo.js.git virgo-js

Navigate to your new directory and install dependencies.

    $ cd virgo-js
    $ npm install

Now, build virgo.js with make.

    $ make

Run the Example
===============

Next, run the heartbeats example, described in the following section.

    $ sudo node examples/heartbeats-only.js

In the output, you should expect a stream of heartbeat objects. 

```json
{
  "v": "0.1.0",
  "id": 42,
  "target": "heartbeats",
  "source": "Heartbeats",
  "method": "heartbeat.post",
  "params": {
    "timestamp": 1408568615206
  }
}
```

Heartbeats Example in Detail
============================

The [Heartbeats Only](https://github.com/bravelittlescientist/virgo.js/blob/master/examples/heartbeats-only.js) example
demonstrates how virgo.js is used. The purpose of this example is for the agent to send heartbeats to demonstrate that
it is still there (in the form of updates at a set interval).

```javascript
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
```

License
=======

Virgo.js is distributed under the [Apache License 2.0][apache].

[apache]: http://www.apache.org/licenses/LICENSE-2.0.html

