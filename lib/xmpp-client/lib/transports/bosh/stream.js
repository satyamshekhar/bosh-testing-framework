var util   = require("util");
var assert = require("assert").ok;

function Stream(session, options) {
    this._to    = options.to;
    this._from  = options.from;
    this._lang  = options.lang;
    this._route = options.route;
    // this._name  = "nothing";

    this._session = session;
    this._connected = false;
    this._pendingStanzas = [ ];
};

Stream.prototype.send = function (stanza) {
    this._pendingStanzas.push(stanza);
    this._session._trySending();
};

Stream.prototype.terminate = function (reason) {
    this._session.terminateStream(this.name);
};

Stream.prototype.connect = function () {
    if (this._connected) return;
    this._connected = true;

    var attrs = {
        from: this._from,
        to  : this._to
    };

    if (this._lang) attrs.lang   = this._lang;
    if (this._route) attrs.route = this._route;

    this._session.connect(attrs);
};

Stream.prototype.restart = function () {
    this._session.enqueueBoshReq(this, {
        
        
    });
};

exports.Stream = Stream;