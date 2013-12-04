/**
 *  Copyright Tomaz Muraus
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 *
 */

var LineEmitter = require('../lib/emitter').LineEmitter;

exports['test_line_emitter_single_chunk'] = function(test, assert) {
  var count, lines, le;

  count = 0;
  lines = ['test1', 'test2', 'test3', 'test4'];
  le = new LineEmitter();

  le.on('data', function(line) {
    assert.equal(line, lines[count++]);

    if (count === 4) {
      test.finish();
    }
  });

  le.write('test1\ntest2\ntest3\ntest4\n');
};

exports['test_line_emitter_multiple_chunks'] = function(test, assert) {
  var count, lines, le;

  count = 0;
  lines = ['test1', 'test2', 'test3', 'test4', 'test5'];
  le = new LineEmitter();

  le.on('data', function(line) {
    assert.equal(line, lines[count++]);

    if (count === 5) {
      test.finish();
    }
  });

  le.write('test1\n');
  le.write('test2\n');
  le.write('test3\n');
  le.write('test4\ntest5');
  le.write('\n');
};

exports['test_line_emitter_multiple_chunks_includeNewLine'] = function(test, assert) {
  var count, lines, le;

  count = 0;
  lines = ['test1\n', 'test2\n', 'test3\n', 'test4\n', 'test5\n'];
  le = new LineEmitter('', {'includeNewLine': true});

  le.on('data', function(line) {
    assert.equal(line, lines[count++]);

    if (count === 5) {
      test.finish();
    }
  });

  le.write('test1\n');
  le.write('test2\n');
  le.write('test3\n');
  le.write('test4\ntest5');
  le.write('\n');
};
