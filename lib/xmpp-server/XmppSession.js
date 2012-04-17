var util          = require("util");
var XmppParser    = require("./stream-parser.js");
var EventEmitter  = require("events").EventEmitter;
var log           = require("./log.js").getLogger("[XmppSession.js]");
var packetHandler = require("../../config.js").xmppServer.packetHandlers;

function XmppSession (socket) {
    EventEmitter.apply(this);
    this.id      = "nothing";
    this._socket = socket;
    this._parser = new XmppParser();
    this._attachListenersToParser();
    this._socket.on("data", this._parser.parse.bind(this._parser));

    this._packetHandlers = [ ];
    for (var i = 0, l = packetHandler.length; i < l; i++) {
        this._packetHandlers.push(new packetHandler[i](this));
    }

    /* default config */
    this._load = 1;
    this._message = 4;
};
util.inherits(XmppSession, EventEmitter);

XmppSession.prototype.terminate = function (error) {
    log.info("%s terminate %s", this.id, error);
    this.emit("terminate");
    this._socket.end();
    this._parser.end();
};

XmppSession.prototype._attachListenersToParser = function () {
    this._parser.on("error", this.terminate.bind(this));
    this._parser.on("stanza", this._handleStanza.bind(this));
    this._parser.on("stream-end", this._handleStreamEnd.bind(this));
    this._parser.on("stream-start", this._handleStreamStart.bind(this));
    this._parser.on("stream-restart", this._handleStreamRestart.bind(this));
};

XmppSession.prototype._handleStanza = function (stanza) {
    for (var i = 0, l = this._packetHandlers.length; i < l; i++) {
        var dont = this._packetHandlers[i].consume(stanza);
        if (dont === false) {
            return;
        }
    }
};

XmppSession.prototype._handleStreamRestart = function (attrs) {
    log.info("%s stream-restart", this.id);
};

XmppSession.prototype._handleStreamStart = function (attr) {
    if (!attr.from) {
        this.terminate("no from");
    }
    log.info("stream-start %s", util.inspect(attr));
    this.id = attr.from;
    this._from = attr.from;
    this._socket.write("<stream:stream to='" + attr.from  + "'>");
    log.info("%s stream-start", this.id);
};

XmppSession.prototype._handleStreamEnd = function () {
    log.info("%s stream-end", this.id);
};

module.exports = XmppSession;