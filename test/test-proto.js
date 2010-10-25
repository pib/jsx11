var assert = require('assert');
var proto = require('../lib/proto');

var cr = new proto.ConnectRequest();
cr.byte_order = '>';
cr.set('protocol-major-version', 11);
cr.set('protocol-minor-version', 0);
cr.set('authorization-protocol-name', 'foo');
cr.set('authorization-protocol-data', 'bar');
console.log(cr.fields);s

console.log(cr.size());
var buffer = new Buffer(cr.size());
cr.encode(buffer);
console.log(buffer);

var cr2 = new proto.ConnectRequest();
cr2.decodeHeader(buffer);
cr2.decodeBody(buffer.slice(cr2.headerSize()));

//console.log(cr2);

assert.equal(cr2['protocol-major-version'], 11);
assert.equal(cr2['protocol-minor-version'], 0);
assert.equal(cr2['authorization-protocol-name'], 'foo');
assert.equal(cr2['authorization-protocol-data'], 'baroo');
