exports.lookup = {
    port: 9000,
    "fb-messaging-handler"   : "localhost:5222",
    "tfd-messaging-handler"  : "localhost:5222",
    "gtalk-messaging-handler": "localhost:5222"
};

exports.xmppServer = {
    port: 3663,
    packetHandlers: [
        require("./lib/xmpp-server/packet-handler/roster.js"),
        require("./lib/xmpp-server/packet-handler/presence.js"),
        require("./lib/xmpp-server/packet-handler/message.js")
    ]
};

exports.client = {
    
};