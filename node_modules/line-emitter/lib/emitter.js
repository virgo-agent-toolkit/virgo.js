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

var util = require('util');
var EventEmitter = require('events').EventEmitter;

function LineEmitter(initialBuffer, options) {
  options = options || {};

  this._buffer = initialBuffer || '';
  this._includeNewLine = options.includeNewLine;
}

util.inherits(LineEmitter, EventEmitter);

LineEmitter.prototype.write = function(chunk) {
  var line;

  this._buffer += chunk;

  line = this._popLine();

  while (line !== false) {
    this.emit('data', line);
    line = this._popLine();
  }
};

LineEmitter.prototype._popLine = function() {
  var line = false,
      index = this._buffer.indexOf('\n');

  if (index !== -1) {
    line = this._buffer.substring(0, index);

    if (this._includeNewLine) {
      line += '\n';
    }

    this._buffer = this._buffer.substring(index + 1);
  }

  return line;
};

exports.LineEmitter = LineEmitter;
