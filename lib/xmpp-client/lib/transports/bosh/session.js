var util   = require("util");
var http   = require("http");
var assert = require("assert").ok;
var _      = require("underscore");
var Stream = require("./stream.js").Stream;
var log    = require("log4js").getLogger("[bosh-session.js]");
var $builder     = require("../../builder.js");
var $body        = $builder.body;
var BoshParser   = require("./bosh-request-parser.js").BoshRequestParser;
var EventEmitter = require("events").EventEmitter;

var STATE_CONNECTED    = 0,
    STATE_DISCONNECTED = 1,
    STATE_CONNECTING   = 2;

function Session(options) {
    EventEmitter.apply(this);
    this._host = options.host;
    this._port = options.port;
    this._path = options.path;

    this._ack  = 1;
    this._ver  = "1.6";

    this._hold = options.hold || 1;
    this._wait = options.wait || 60;
    this._inactivity = options.inactivity || 15 * 60;

    this._parser    = new BoshParser();
    this._connected = false;

    this._state = STATE_DISCONNECTED;
    this._sendingInNextTick = false;

    this._streamsMap = { };
    this._streams    = [ ];
    this._nextStream = 0;
    this._notConnectedStreams = { };

    // set by server
    this._sid      = null;
    this._requests = 2;

    this._nextRidToSend  = Math.floor(Math.random() * 10000);
    this._minRespondedTo = this._nextRidToSend - 1;

    // window contains pairs - 
    // { 
    //   rid:  { 
    //     request: req body
    //     res    : res body
    //   }
    // }

    this._ridToRequestResponse = { };
    this._pendingXmppStanzas   = { };
    this._pendingAttrs         = { };
    this._pendingBody          = [ ];
}

util.inherits(Session, EventEmitter);

Session.prototype.newStream = function (attrs) {
    assert(attrs.from && !this._notConnectedStreams[attrs.from]);
    this._notConnectedStreams[attrs.from] = new Stream(this, attrs);
    return this._notConnectedStreams[attrs.from];
};
Session.prototype.connect = function (attrs) {
    if (this._state === STATE_DISCONNECTED) {
        this._sendSessionCreationRequest(attrs);
    } else {
        this._sendStreamCreationRequest(attrs);
    }
};
Session.prototype._sendStreamCreationRequest = function (attrs) {
    this._pendingBody.push($body(attrs));
    this._sendPending();
};
Session.prototype._sendSessionCreationRequest = function (attrs) {
    var _attrs = {
        version       : this._ver,
        content: 'text/xml; charset=utf-8',
        from          : attrs.from,
        hold          : this._hold,
        to            : attrs.to,
        wait          : this._wait,
        rid           : this._nextRidToSend,
        inactivity    : this._inactivity,
        ack           : "1",
        "xmpp:version": "1.0",
        "secure"      : "false",
        "xmlns:xmpp"  : "urn:xmpp:xbosh:version"
    };
    _.extend(_attrs, attrs);
    
    var options = {
        host: this._host,
        port: this._port,
        path: this._path,
        method: "POST"
    };
    var rid = this._nextRidToSend;
    var req = http.request(options, function (res) {
        res.on("data", function (d) {
            this._parser.parse(d);
            // log.info(d.toString());
        }.bind(this));
        res.on("end", function () {
            if (this._parser.parsedBody) {
                this._connected = true;
                var body = this._parser.parsedBody;
                this._sid = body.attrs.sid;
                this._inactivity = body.attrs.inactivity;
                this.emit("connected");
                this._streams.push(this._notConnectedStreams[attrs.from]);
                delete this._notConnectedStreams[attrs.from];
                log.info("RECV: %s", this._parser.parsedBody);
                this._minRespondedTo++;
                delete this._ridToRequestResponse[rid];
                this._sendPending();
            } else {
                log.error("parsing failed - ignoring req");
            }
            log.info("received response for rid: %s", rid);
        }.bind(this));
    }.bind(this));
    req.end($body(_attrs).toString());
    log.info("sent: %s", $body(_attrs));
    this._nextRidToSend++;
    // this._trySending();
};
Session.prototype._trySending = function () {
    if (!this._sendingInNextTick) {
        process.nextTick(function () {
            this._sendingInNextTick = false;
            this._sendPending();
        }.bind(this));
        this._sendingInNextTick = true;
    }
};
Session.prototype._stitchBodyForStream = function (stream) {
    if (!(stream._pendingStanzas.length)) {
        return false;
    }
    var body = $body();
    stream._pendingStanzas.forEach(function (stanza) {
        body.cnode(stanza);
    });
    stream._pendingStanzas = [ ];
    return body;
};
Session.prototype._stitchBody = function () {
    var len = this._streams.length;
    if (!len) {
        return false;
    }
    this._nextStream = this._nextStream % len;
    // Processing streams one after another avoids
    // starvation of any one stream.
    var nextStream = this._nextStream;
    do {
        var stream = this._streams[this._nextStream];
        this._nextStream = (this._nextStream + 1) % len;
        var response = this._stitchBodyForStream(stream);
        if (response) {
            this._pendingBody.push(response);
            break;
        }
    } while (this._nextStream !== nextStream);
};
Session.prototype._sendPending = function () {
    while (true) {
        if (this._nextRidToSend - this._minRespondedTo > this._requests) {
            log.info("Queued, Cant send right now, _nextRidToSend - minRespondedTo: %s", this._nextRidToSend - this._minRespondedTo);
            break;
        }

        if (!this._pendingBody.length) this._stitchBody();

        if (!this._pendingBody.length && (this._nextRidToSend - this._minRespondedTo === 1)) {
            this._pendingBody.push($body());
        }

        if (this._pendingBody.length) {
            this._sendBody(this._pendingBody.shift());
        } else {
            break;
        }
    }
};
Session.prototype._sendBody = function (body) {
    if (!body.attr.rid) {
        body.attrs.rid = this._nextRidToSend;
    }
    if (this._sid) {
        body.attrs.sid = this._sid;
    }
    var rid = body.attrs.rid;
    body.attrs.xmlns = "http://jabber.org/protocol/httpbind";
    
    this._ridToRequestResponse[rid] = {
        req: body,
        res: null
    };
    log.info("sent: %s", body);
    var options = {
        host: this._host,
        port: this._port,
        path: this._path,
        method: "POST"
    };
    var request = http.request(options, function (res) {
        var responseString = "";
        res.on("data", function (d) {
            responseString += d;
            // this._parser.parse(d);
            // log.info(d.toString());
        }.bind(this));
        res.on("end", function () {
            log.debug("RECD: %s", responseString);
            // if (this._parser.parsedBody) {
            this._ridToRequestResponse[rid].res = this._parser.parsedBody;
            this._minRespondedTo++;
            log.info("next: %s, min: %s", this._nextRidToSend, this._minRespondedTo);
            this._sendPending();
                // this._processResponse();
        // } else {
            // log.error("parsing failed - ignoring req");
        // }
            // log.info("received response for rid: %s", rid);
        }.bind(this));
    }.bind(this));
    this._nextRidToSend++;
    request.end(body.toString());
};
Session.prototype.terminate = function () {

};

exports.BOSH = Session;