var assert = require('assert'),
    STRING8 = require('../lib/types').STRING8;

var callback = null;
var set_value = null;
var fake_owner = {
    set: function(field, value) {
        callback(fake_owner, value);
    },
    subscribe: function(field, cb) {
        callback = cb;
    }
};
var s = new STRING8(fake_owner, {length_field: 'l', default: 'woot'});
assert.equal(s.value, 'woot');
assert.equal(s.format, '4A');

s.set(fake_owner, 'what is up?');
assert.equal(s.value, 'what is up?');
assert.equal(s.format, '11A1x');

s.set(fake_owner, new Buffer('what is up now?'));
assert.equal(s.value, 'what is up now?');
assert.equal(s.format, '15A1x');

fake_owner.set('l', 10);
assert.equal(s.format, '10A2x');