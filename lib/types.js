var pack = require('./util/jspack').jspack;

function PackedType(format) {
    this.format = format;
}
PackedType.prototype = {
    size: function() {
        return pack.CalcLength(this.format);
    },
    decode: function(byte_order, buffer) {
        return pack.Unpack(byte_order + this.format, buffer);
    },
    encode: function(byte_order, buffer, value) {
        return pack.PackTo(byte_order + this.format, buffer, 0, value);
    },
    on_set: function(val) {},
    update_format: function() {}
};

var types = {
    CARD16: 'H', // unsigned short
    PAD16: 'xx'
};

for (var type in types) {
    exports[type] = new PackedType(types[type]);
}

function pad(E) {
    return (4 - (E % 4)) % 4;
}

function STRING8(owner, field, length_field) {
    this.owner = owner;
    this.field = field;
    this.length_field = length_field;
}
STRING8.prototype = Object.create(PackedType.prototype);
STRING8.prototype.update_format = function() {
    var length = this.owner[this.field].length;
    length = length + pad(length);
    this.format = length + 'A';
};
STRING8.prototype.on_set = function(value) {
    this.owner[this.length_field] = value.length;
    this.format = value.length + 'A';
};
exports.STRING8 = STRING8;

function LEN16(owner, field) {
    this.format = 'H';
    this.owner = owner;
    this.field = field;
}
LEN16.prototype = Object.create(PackedType.prototype);
LEN16.prototype.on_set = function(value) {
    this.owner.fields[this.field].update_format();
};
exports.LEN16 = LEN16;

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
    console.log('format', this.format);
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