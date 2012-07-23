var ltx    = require('ltx');
var util   = require('util');
var events = require('events');
var expat  = require('node-expat');
var _      = require('underscore');

function XmppStreamParser() {
    events.EventEmitter.apply(this);

    this.__defineGetter__("getCurrentByteIndex", function () {
        return this._parser ? this._parser.getCurrentByteIndex() : 0;
    });

    this._start();
}

util.inherits(XmppStreamParser, events.EventEmitter);

_.extend(XmppStreamParser.prototype, {
    _handle_start_element: function(name, attrs) {
        if (!this._started) {
            if (name === "stream:stream") {
                this._started = true;
                this.emit("stream-start", attrs);
            } else {
                this.emit("error", "stanza w/o stream-start");
                this.end();
            }
        } else {
            var stanza = new ltx.Element(name, attrs);
            if (name === "stream:stream") {
                this.emit("stream-restart", attrs, stanza);
            } else {
                if (this.stanza) {
                    this.stanza = this.stanza.cnode(stanza);
                } else {
                    this.stanza = stanza;
                }
            }
        }
    },

    _handle_end_element: function(name, attrs) {
        if (name === "stream:stream") {
            this.emit("stream-end", attrs);
            this.end();
            return;
        }

        if (this.stanza) {
            if (this.stanza.parent) {
                this.stanza = this.stanza.parent;
            } else {
                this.emit("stanza", this.stanza);
                delete this.stanza;
            }
        } else {
            // This happens at times.
            this.emit("error", "end-element w/o start");
            this.end();
        }
    },

    _handle_text: function(txt) {
        // top level text nodes are
        // ignored. (not valid in xmpp).
        if (this.stanza) {
            this.stanza.t(txt);
        }
    },

    _handle_entity_decl: function() {
        this.emit("error", "entity-decl-not-allowed");
        this.end();
    },

    parse: function(data) {
        if (this._parser && !this._parser.parse(data)) {
            // in case the parser is deleted on end-stream
            // and there is garbage after that.
            if (this._parser) {
                this.emit("error", this._parser.getError());
            }
        }
    },

    _start: function () {
        this._parser = new expat.Parser('UTF-8');
        this._started = this._started || false;

        this._parser.on("text", this._handle_text.bind(this));
        this._parser.on("endElement", this._handle_end_element.bind(this));
        this._parser.on("entityDecl", this._handle_entity_decl.bind(this));
        this._parser.on("startElement", this._handle_start_element.bind(this));
    },

    end: function() {
        if (this._parser) {
            this._parser.stop();
            this._parser.removeAllListeners();
            delete this._parser;
        }
    },

    restart: function() {
        this.end();
        this._start();
    }
});

exports.XmppStreamParser = XmppStreamParser;
