var util = require("util");
var EventEmitter = require("events").EventEmitter;

var ns       = require("./namespaces.js");
var JID      = require("./jid.js").JID;
var auth     = require("./auth.js");
var states   = require("./states.js");
var $builder = require("./builder.js");

var path        = require('path');
var filename    = "[" + path.basename(path.normalize(__filename)) + "]";
var log         = require('./log.js').getLogger(filename);

function Account (options, transport) {
    this.jid = new JID(options.jid);
    if (!this.jid) {
        throw new Error("invalid jid.");
    }

    EventEmitter.call(this);

    this._options   = options;
    this._transport = transport;
    this._password  = options.password;
    this._resource  = options.resource;
    this._state     = states.ACCOUNT_LOGGED_OUT;
};

util.inherits(Account, EventEmitter);

Account.prototype.login = function () {
    this._transport.on("disconnected", this._disconnect.bind(this));
    this._transport.on("connected", this._setupStanzaListener.bind(this));
    this._transport.on("error", this._onTransportError);

    this._state = states.ACCOUNT_CONNECTING;
    this._transport.connect({
        to   : this._options.to,
        from : this.jid.fulljid,
        route: this._options.route
    });
};

Account.prototype.logout = function () {
    
};

Account.prototype.sendMessage = function (to, message) {
    
};

Account.prototype.setPresence = function () {
    
};

Account.prototype._sendStanza = function () {
    
};

Account.prototype._onStanza = function (stanza) {
    log.debug("%s _onStanza: %s", this._jid.full, stanza);
};

Account.prototype._setupStanzaListener = function (stanza) {
    this._transport.removeAllListeners("connected");
    this._state = states.ACCOUNT_CONNECTED;
    
    this._stanzaListenerSeries = [
        this._authenticate.bind(this),
        this._handleAuthResponse.bind(this),
        this._handleStreamFeatures.bind(this),
        this._onStanza.bind(this)
    ];
    
    this._transport.on("stanza", function (stanza) {
        var fn = this._stanzaListenerSeries.shift();
        if (this._stanzaListenerSeries.length === 0) {
            this._stanzaListenerSeries.push(fn);
        }
        fn(stanza);
    }.bind(this));
};

Account.prototype._authenticate = function (features) {
    var mechanisms = features.getChild("mechanisms", ns.XMPP_SASL);
    var authMechHandler = auth.getMechanism(mechanisms);

    if (!authMechHandler) {
        this._disconnect("auth-mech-not-supported");
        return;
    }

    this._state = states.ACCOUNT_AUTHENTICATING;
    
    var stanza = authMechHandler.nextResponse(this.jid.fulljid, this._password);
    var consumer = authMechHandler.nextConsumer();

    if (consumer) {
        this._stanzaListenerSeries.unshift(consumer);
    }
    
    if (stanza) {
        this._transport.send(stanza);
    }
};

Account.prototype._handleAuthSuccess = function (stanza) {
    if (stanza.is("success", ns.XMPP_SASL)) {
        this._state = states.AUTHENTICATED;
        this._transport.restart();
    } else {
        this._state = states.ACCOUNT_AUTH_FAIL;
        this._disconnect("auth-fail");
    }
};

Account.prototype._handleStreamFeatures = function (features) {
    if (features.getChild("bind", ns.XMPP_BIND)) {
        this._stanzaListenerSeries.unshift(this._bindResource);
        this._stanzaListenerSeries.unshift(this._bindResourceHandler);
    }
    if (features.getChild("session", ns.XMPP_SESSION)) {
        this._stanzaListenerSeries.unshift(this._startSession);
        this._stanzaListenerSeries.unshift(this._startSessionHandler);
    }
    /* if neither is present onStanza will be called */
    this._transport.emit("stanza");
};

Account.prototype._bindResource = function () {
    var iq = $builder
            .iq({type : "set"})
            .cnode($builder("bind", {xmlns: ns.XMPP_BIND}))
            .tree();
        
    if (this._resource) {
        iq.getChild("bind")
            .cnode($builder("resource"))
            .t(this._resource);
    }
    this._transport.send(iq);
};

Account.prototype._bindResourceHandler = function (stanza) {
    var isBindResponse = function () {
        return stanza.is("iq") && stanza.attrs.type === "result";
    };

    var error = null;
    if (!isBindResponse()) 
        error = "invalid-bind-response";

    if (stanza.getChild("error")) 
        error = "bind-error";

    if (error) {
        this._disconnect(error);
        return;
    }

    var jid = stanza.getChild("bind").getChild("jid").getText(); 
    this.jid = new JID(jid);
    this._transport.emit("stanza");
};

Account.prototype._startSession = function () {
    var iq = $builder
            .iq({type: "set", to: this._options._to})
            .cnode($builder("session", {xmlns: ns.XMPP_SESSION}))
            .tree;
    this._transport.send(iq);
};

Account.prototype._startSessionHandler = function (stanza) {
    var isSessionResponse = function () {
        return stanza.is("iq") && stanza.attrs.type === "result";
    };

    var error = null;
    if (!isSessionResponse()) 
        error = "invalid-bind-response";

    if (stanza.getChild("error")) 
        error = "bind-error";

    if (error) {
        this._disconnect(error);
        return;
    }

    this._state = states.ACCOUNT_ONLINE;
    this.emit("online");
};