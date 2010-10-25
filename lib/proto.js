var pack = require('./util/jspack').jspack,
    types = require('./types');

var bom = {
    0x42: '>',
    0x6c: '<',
    '>': 0x42,
    '<': 0x6c
};

function Request(byte_order, options) {
    this.subscribers = {};
    this.options = options || {};
    this.byte_order = byte_order || '>';
    this.fields = {};
    this.init_protocol(this.header_protocol);
    this.init_protocol(this.body_protocol);
    for (var name in options) {
        this.set(name, options[name]);
    }
}
Request.prototype.init_protocol = function(protocol) {
    protocol.names = [];
    protocol.format = this.byte_order || '>';
    for (var i=0; i<protocol.length; i++) {
        var name = protocol[i].name,
            type = protocol[i].type,
            instance = new type(this, protocol[i]);
        if (name) {
            this.fields[name] = instance;
            protocol.names.push(name);
        }
        protocol.format += instance.format;
    }
};
Request.prototype.update_format = function() {
    this.update_protocol(this.header_protocol);
    this.update_protocol(this.body_protocol);
};
Request.prototype.update_protocol = function(protocol) {
    protocol.format = this.byte_order || '>';
    for (var i=0; i<protocol.length; i++) {
        var name = protocol[i].name,
            type = protocol[i].type,
            instance = this.fields[name] || new type(this, protocol[i]);
        instance.update_format();
        protocol.format += instance.format;
    }
};
Request.prototype.headerSize = function() {
    this.update_format();
    return pack.CalcLength(this.header_protocol.format);
};
Request.prototype.bodySize = function() {
    this.update_format();
    return pack.CalcLength(this.body_protocol.format);
};
Request.prototype.size = function() {
    return (pack.CalcLength(this.header_protocol.format)
            + pack.CalcLength(this.body_protocol.format));
};
Request.prototype.encode = function(buffer) {
    this.update_format();
    var names = this.header_protocol.names.concat(this.body_protocol.names);
    var values = names.map(function(name) {
        return this.fields[name].value;
    }, this);
    pack.PackTo(this.header_protocol.format + this.body_protocol.format.slice(1),
                buffer, 0, values);
};
Request.prototype.decodeHeader = function(buffer) {
    var values = pack.Unpack(this.header_protocol.format, buffer);
    this.header_protocol.names.map(function(name, i) {
        this.set(name, values[i]);
    }, this);
};
Request.prototype.decodeBody = function(buffer) {
    this.update_format();
    var values = pack.Unpack(this.body_protocol.format, buffer);
    this.body_protocol.names.map(function(name, i) {
        this.set(name, values[i]);
    }, this);
};

/*
 * Return the value of the specified field, or an object with all the
 * values if no field is specified
 */
Request.prototype.get = function(key) {
    if (key)
        return this.fields[key].value;
    else {
        var values = {};
        for (key in this.fields) {
            values[key] = this.fields[key].value;
        }
        return values;
    }
};
Request.prototype.set = function(key, val) {
    if (this.fields[key]) {
        this.fields[key].set(this, val);
        var callbacks = this.subscribers[key];
        if (callbacks) {
            for (var i=0; i<callbacks.length; i++)
                callbacks[i](this, val);
        }
    }
};
Request.prototype.subscribe = function(field_name, callback) {
    if (!this.subscribers[field_name])
        this.subscribers[field_name] = [];
    this.subscribers[field_name].push(callback);
};

function ConnectionRequest(byte_order, options) {
    Request.call(this, byte_order, options);
    this.set('byte-order', bom[this.byte_order]);
    this.update_format();
}
ConnectionRequest.prototype = Object.create(Request.prototype);
ConnectionRequest.prototype.header_protocol = [
    {name: 'byte-order', type: types.BYTE, default: 0x42},
    {type: types.PAD, length: 1},
    {name: 'protocol-major-version', type: types.CARD16, default: 11},
    {name: 'protocol-minor-version', type: types.CARD16, default: 0},
    {name: 'n', type: types.CARD16, default: 0},
    {name: 'd', type: types.CARD16, default: 0},
    {type: types.PAD, length: 2}
];
ConnectionRequest.prototype.body_protocol = [
    {name: 'authorization-protocol-name', type: types.STRING8, length_field: 'n'},
    {name: 'authorization-protocol-data', type: types.STRING8, length_field: 'd'}
];
ConnectionRequest.prototype.decodeHeader = function(buffer) {
    this.byte_order = bom[buffer[0]];
    this.update_format();
    return Request.prototype.decodeHeader.call(this, buffer);
};
exports.ConnectionRequest = ConnectionRequest;