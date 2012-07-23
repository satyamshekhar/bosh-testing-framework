var tcp    = require("net");
var ns     = require("../../namespace.js")
var util   = require("util");
var assert = require("assert").ok;
var _      = require("underscore");
var log    = require("log4js").getLogger("[tcp.js]");
var EventEmitter = require("events").EventEmitter;
var StreamParser = require("./stream-parser.js").XmppStreamParser;

function Tcp(options) {
    EventEmitter.apply(this);
    this._host = options.host;
    this._port = options.port || 5222;
    this._parser = new StreamParser();
    this._socket = null;
    this._connected = false;
}

util.inherits(Tcp, EventEmitter);

Tcp.prototype.connect = function (attrs) {
    this._socket = new tcp.Socket();
    this._socket.connect(this._port, this._host);
    this._to = attrs.to;
    this._attachListenersToSocket();
    this._attachListenersToParser();
};

Tcp.prototype.send = function (stanza) {
    this._socket.write(stanza.toString());
    log.debug("SENT: %s", stanza);
};

Tcp.prototype.restart = function () {
    this._parser.restart();
    this._startStream();
};

Tcp.prototype._startStream = function () {
    var streamStart = "<stream:stream xmlns=\"" + ns.XMPP + "\" xmlns:stream=\"" + ns.XMPP_STREAM + "\" version=\"1.0\" to=\"" + this._to + "\">";
    this._socket.write(streamStart);
    log.debug("SENT: %s", streamStart);
};

Tcp.prototype.disconnect = function () {
    if (!this._connected) return;
    this._connected = false;
    this._socket.write("</stream:stream>");
    log.debug("SENT: %s", "</stream:stream>");
    this.emit("disconnected");
};

Tcp.prototype._attachListenersToParser = function () {
    var self = this;
    this._parser.on("stanza", function (stanza) {
        log.debug("RECD: %s", stanza);
        self.emit("stanza", stanza);
    });

    this._parser.on("error", function (error) {
        log.error("parser error: %s", error);
        self.disconnect("parser-error");
    });
};

Tcp.prototype._attachListenersToSocket = function () {
    var self = this;
    this._socket.on("connect", function () {
        self._connected = true;
        self.emit("connected");
        self._startStream();
    });

    this._socket.on("close", function () {
        self._connected = false;
        self.emit("disconnected");
    });

    this._socket.on("data", function (d) {
        log.debug("RAW: %s", d);
        self._parser.parse(d);
    });

    this._socket.on("error", function (err) {
        log.error("socket error: %s", err);
    });
}

exports.Tcp = Tcp;
