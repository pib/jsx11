var assert = require('assert'),
    proto = require('../lib/proto');

function test_defaults() {
    var cr = new proto.ConnectionRequest();
    assert.equal(cr.get('byte-order'), 0x42);
    assert.equal(cr.get('protocol-major-version'), 11);
    assert.equal(cr.get('protocol-minor-version'), 0);
    assert.equal(cr.get('authorization-protocol-name'), '');
    assert.equal(cr.get('authorization-protocol-data'), '');
    assert.equal(cr.get('n'), 0);
    assert.equal(cr.get('d'), 0);
    assert.equal(cr.byte_order, '>');
}

function test_set_via_options() {
    var cr = new proto.ConnectionRequest('<', {
        'protocol-major-version': 42,
        'protocol-minor-version': 2,
        'authorization-protocol-name': 'foobar',
        'authorization-protocol-data': 'foo:bar:baz'
    });
    assert.equal(cr.get('byte-order'), 0x6c);
    assert.equal(cr.get('protocol-major-version'), 42);
    assert.equal(cr.get('protocol-minor-version'), 2);
    assert.equal(cr.get('authorization-protocol-name'), 'foobar');
    assert.equal(cr.get('authorization-protocol-data'), 'foo:bar:baz');
    assert.equal(cr.get('n'), 6);
    assert.equal(cr.get('d'), 11);

    cr.set('authorization-protocol-name', 'blahblah');
    assert.equal(cr.get('n'), 8);
}

function test_encode_decode() {
    var cr = new proto.ConnectionRequest('<', {
        'protocol-major-version': 42,
        'protocol-minor-version': 2,
        'authorization-protocol-name': 'foobar',
        'authorization-protocol-data': 'foo:bar:baz'
    });
    assert.equal(cr.headerSize(), 12);
    assert.equal(cr.bodySize(), 20);
    assert.equal(cr.size(), 32);

    var buffer = new Buffer(cr.size());
    cr.encode(buffer);
    var cr2 = new proto.ConnectionRequest();
    cr2.decodeHeader(buffer);
    assert.equal(cr2.get('protocol-major-version'), 42);
    assert.equal(cr2.get('protocol-minor-version'), 2);
    assert.equal(cr2.get('n'), 6);
    assert.equal(cr2.get('d'), 11);

    cr2.decodeBody(buffer.slice(cr2.headerSize()));
    assert.equal(cr2.get('authorization-protocol-name'), 'foobar');
    assert.equal(cr2.get('authorization-protocol-data'), 'foo:bar:baz');
}

test_defaults();
test_set_via_options();
test_encode_decode();