var types = require('./types');

var MSB = 0x42;
var LSB = 0x6C;

var bom = {
    MSB: '>',
    LSB: '<',
    '>': MSB,
    '<': LSB
};



function XProtocol (byte_order) {
    this.byte_order = byte_order || '>';
    this.fields = {};
    this.compiled_header_protocol = new types.TypeSet(this.header_protocol, this.fields);
    this.compiled_body_protocol = new types.TypeSet(this.body_protocol, this.fields);
}
XProtocol.prototype = {
    headerSize: function() {
        return this.compiled_header_protocol.size();
    },

    compile: function() {
        this.compiled_header_protocol.compile();
        this.compiled_body_protocol.compile();
    },

    size: function() {
        return this.headerSize() + this.compiled_body_protocol.size();
    },
    /*
     * headerDecoded is called by the decodeHeader method after the
     * header has been decoded, so that subclasses can update fields as
     * needed after the header has been parsed. It should return the
     * length which the body will be.
     */
    headerDecoded: function() {
        return 0;
    },

    /*
     * decodeHeader methods take a data buffer, initialize their
     * header data fields from the data buffer, and return the number of
     * bytes required to parse their body.
     */
    decodeHeader: function(buffer) {
        this.compiled_header_protocol.decode(this, buffer);
        this.compile();
        return this.headerDecoded();
    },
    /*
     * decodeBody methods take a byte-order and data buffer, initialize their
     * body data fields from that buffer.
     */
    decodeBody: function(buffer) {
        this.compiled_body_protocol.decode(this, buffer);
    },

    /*
     * a callback indicating a field was set, for subclasses to use to update
     * their internal fields as needed.
     */
    fieldSet: function(field, val) {},

    set: function(field, val) {
        this[field] = val;
        this.fields[field].on_set(val);
        this.fieldSet(field, val);
    },

    encode: function(buffer) {
        this.compile();
        this.compiled_header_protocol.encode(this, buffer);
        this.compiled_body_protocol.encode(this, buffer.slice(this.headerSize()));
    }
};

/*
 * The ConnectRequest object is a special request object, in that it doesn't
 * conform to the standard request object protocol, and in that it is the
 * object that parses the byte order from the incoming data.
 */
function ConnectRequest(byte_order) {
    this.body_protocol = [
        ['authorization-protocol-name', new types.STRING8(this, 'authorization-protocol-name', 'n')],
        ['authorization-protocol-data', new types.STRING8(this, 'authorization-protocol-data', 'd')]
    ];
    XProtocol.call(this, byte_order);
}
ConnectRequest.prototype = Object.create(XProtocol.prototype);
ConnectRequest.prototype.header_protocol = [
    ['protocol-major-version', types.CARD16],
    ['protocol-minor-version', types.CARD16],
    ['n', new types.LEN16(this, 'authorization-protocol-name')],
    ['d', new types.LEN16(this, 'authorization-protocol-data')],
    ['_unused', types.PAD16]
];
ConnectRequest.prototype.headerSize = function() {
    return XProtocol.prototype.headerSize.call(this) + 1;
};
ConnectRequest.prototype.decodeHeader = function(data) {
    this.byte_order = bom[data[0]];
    XProtocol.prototype.decodeHeader.call(this, this.byte_order, data.slice(1));
    return (this['authorization-protocol-name-length']
            + this['authorization-protocol-data-length']);
};
ConnectRequest.prototype.encode = function(buffer) {
    console.log(buffer);
    buffer[0] = bom[this.byte_order];
    console.log(buffer);
    XProtocol.prototype.encode.call(this, buffer);
};

exports.ConnectRequest = ConnectRequest;