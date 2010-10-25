var pack = require('./util/jspack').jspack;

function PackedType(owner, options) {
    this.options = options || {};
    this.value = this.options.default;
}
PackedType.prototype.set = function(owner, val) {
    this.value = val;
    this.after_set(owner);
};
PackedType.prototype.after_set = function(owner) {};
PackedType.prototype.update_format = function() {};

function make_type(name, format) {
    function simple_type(owner, options) {
        PackedType.call(this, owner, options);
    }
    simple_type.prototype = Object.create(PackedType.prototype);
    simple_type.prototype.format = format;
    exports[name] = simple_type;
}

make_type('BYTE', 'B');
make_type('CARD16', 'H');

function PAD(owner, options) {
    PackedType.call(this, owner, options);
    this.length = this.options.length || 1;
    this.format = this.length + 'x';
}
PAD.prototype = Object.create(PackedType.prototype);
exports.PAD = PAD;

function calc_pad(E) {
    return (4 - (E % 4)) % 4;
}

function STRING8(owner, options) {
    PackedType.call(this, owner, options);
    this.length = this.options.length || null;
    this.value = this.value || '';
    this.update_format();
    var self = this;
    owner.subscribe(options.length_field, function(owner, len) {
        self.length = len;
        self.update_format();
    });
}
STRING8.prototype = Object.create(PackedType.prototype);
STRING8.prototype.update_format = function() {
    var len = this.length || this.value.length;
    var pad = calc_pad(len);
    this.format = len + 's';
    if (pad)
        this.format += pad + 'x';
};
STRING8.prototype.after_set = function(owner) {
    this.length = null;
    if (typeof this.value != 'string') {
        this.value = this.value.toString('binary');
    }
    owner.set(this.options.length_field, this.value.length);
    this.update_format();
};
exports.STRING8 = STRING8;

/*
 * Take a nicely-formatted protocol spec and return an object with the
 * following things in it:
 *
 *   compile() - recompile the format (for example, after changing the
 *   length of one of the protocol fields
 *
 *   encode(byte_order, data, buffer) - takes the fields from data and encodes them
 *   into buffer
 *
 *   decode(byte_order, data, buffer) - decodes the fields from buffer and sets them
 *   on data
 *
 *   size() - return the size, in bytes, that the format takes up
 *
 *
 * Protocol specs should be in the form of a list of name, type
 * lists. If a name starts with a '_', it is assumed that it is a
 * padding type, and no variable will be output for it.
 *
 */

function TypeSet(protocol, fields) {
    this.protocol = protocol;
    this.fields = fields;
    this.compile();
}
TypeSet.prototype.compile = function() {
    this.names = [];
    this.format = '>';

    var proto_steps = this.protocol.length;
    for (var i=0; i < proto_steps; i++) {
        var name = this.protocol[i][0],
            type = this.protocol[i][1];
        if (name[0] != '_') {
            this.names.push(name);
            this.fields[name] = type;
        }
        this.format += type.format;
    }
    this.names_length = this.names.length;
};
TypeSet.prototype.encode = function(data, buffer) {
    this.format[0] = data.byte_order;
    var values = [];
    for (var i=0; i < this.names_length; i++)
        values.push(data[this.names[i]]);
    var ret = pack.PackTo(this.format, buffer, 0, values);
};
TypeSet.prototype.decode = function(data, buffer) {
    this.format[0] = data.byte_order;
    var values = pack.Unpack(this.format, buffer);
    for (var i=0; i < this.names_length; i++)
        data.set(this.names[i], values[i]);
};
TypeSet.prototype.size = function() {
    return pack.CalcLength(this.format);
};
exports.TypeSet = TypeSet;