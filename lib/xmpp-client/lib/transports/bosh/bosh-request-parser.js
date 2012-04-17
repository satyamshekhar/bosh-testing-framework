var ltx    = require('ltx');
var util   = require('util');
var _  = require('underscore');
var expat  = require('node-expat');

function BoshRequestParser() {
    this._parser = new expat.Parser('UTF-8');
    this._parser.parse("<bosh>");

    this._started = false;
    this.parsedBody = null;

    this._parser.on("text", this._handle_text.bind(this));
    this._parser.on("endElement", this._handle_end_element.bind(this));
    this._parser.on("entityDecl", this._handle_entity_decl.bind(this));
    this._parser.on("startElement", this._handle_start_element.bind(this));
}

_.extend(BoshRequestParser.prototype, {
    _handle_start_element: function(name, attrs) {
        if (!this._started) {
            if (name === "body") {
                this._started = true;
            } else {
                this.end();
                return;
            }
        } 

        var stanza = new ltx.Element(name, attrs);
        if (this.stanza) {
            this.stanza = this.stanza.cnode(stanza);
        } else {
            this.stanza = stanza;
        }
    },

    _handle_end_element: function(name, attrs) {
        if (this.stanza) {
            if (this.stanza.parent) {
                this.stanza = this.stanza.parent;
            } else {
                this.parsedBody = this.stanza;
                delete this.stanza;
            }
        } else {
            // This happens at times.
            this.end();
        }
    },

    _handle_text: function(txt) {
        // only text nodes inside body are considered.
        if (this.stanza) {
            this.stanza.t(txt);
        }
    },

    _handle_entity_decl: function() {
        this.end();
    },

    parse: function(data) {
        if (this._parser && !this._parser.parse(data)) {
            this.end();
            return false;
        }
        else if (!this._parser) {
            return false;
        }
        return true;
    },

    end: function() {
        if (this._parser) {
            this._parser.stop();
            this._parser.removeAllListeners();
            if (this._stanza) {
                delete this._stanza;
            }
            if (this.parsedBody) {
                delete this.parsedBody;
            }
            delete this._parser;
        }
    }
});

var globalParser = null;
function getGlobalParser () {
    if (!globalParser) globalParser = new BoshRequestParser();
    return globalParser;
}

exports.getGlobalParser   = getGlobalParser;
exports.BoshRequestParser = BoshRequestParser;