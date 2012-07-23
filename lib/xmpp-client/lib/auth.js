var util     = require("util");
var ns       = require("./namespace.js");
var $builder = require("./builder.js");

var supportedMechanisms = {
    "PLAIN"         : PlainText,
    "DIGEST-MD5"    : MD5,
    "PLAIN-PW-TOKEN": PlainPW
};

function Mechanism() {
    this.nextResponse = function () { };
    this.nextConsumer = function () { };
}


function PlainText() {
};
function MD5() {
};

function PlainPW() {
    this.nextResponse = function (jid, password, token) {
        token = token || "some-token";
        var authText = new Buffer("\u0000" + jid.user + "\u0000" + password + "\u0000" + token).toString("base64");
        return $builder("auth", {
            mechanism: "PLAIN-PW-TOKEN",
            xmlns: ns.XMPP_SASL
        }).t(authText);
    };
};

PlainPW.prototype = new Mechanism();

var getMechanism = function (features) {
    return new PlainPW();
};

exports.getMechanism = getMechanism;
