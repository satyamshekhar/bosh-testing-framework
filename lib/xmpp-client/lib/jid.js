function JID (jid_str) {
    this.__defineGetter__("user", function (user) {
        return this._user;
    });
    this.__defineGetter__("domain", function (domain) {
        return this._domain;
    });
    this.__defineGetter__("resource", function (resource) {
        return this._resource;
    });

    this.__defineSetter__("user", function (user) {
        this._user = user;
    });
    this.__defineSetter__("domain", function (domain) {
        this._domain = domain;
    });
    this.__defineSetter__("resource", function (resource) {
        this._resource = resource;
    });
    
    this.__defineGetter__("bare", function () {
        return this._user + "@" + this._domain;
    });
    this.__defineGetter__("full", function () {
        return this._user + "@" + this._domain + "/" + this._resource;
    });

    this._parse(jid_str);
}

JID.prototype.parse = function (jid) {
    this._user = jid.substr(0, jid.indexOf("@"));
    
    var domainEnd = jid.indexOf("/");
    if (domainEnd === -1) {
        this._domain = jid.substr(jid.indexOf("@") + 1);
        this._resource = null;
    } else {
        this._domain = jid.substr(jid.indexOf("@") + 1, domainEnd);
        this._resource = jid.substr(domainEnd + 1);
    }
};

exports.JID = JID;