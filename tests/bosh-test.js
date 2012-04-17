var ltx = require("ltx");
var BoshSession = require("../lib/xmpp-client/lib/transports/bosh/session.js").BOSH;


for (var i = 0; i < 10; i++) {
    (function () {
        var boshSession = new BoshSession({
            host: "localhost",
            port: 10280,
            path: "/http-bind/"
        });
        var stream = boshSession.newStream({
            from: "test" + i + "@loader.com",
            to: "stub-server@loader.com",
            route: "talkto:tfd-messaging-handler:0"
        });
        stream.connect();
        boshSession.on("connected", function () {
            stream.send(new ltx.Element("session", {
                "load": 1,
                "roster": 2,
                "presence": 1,
                "message": 6
            }));
        }, 3000);
    })();
}