var tcp         = require("net");
var log         = require("./log.js").getLogger("[xmpp-stub-server.js]");
var XmppSession = require("./XmppSession.js");
var config      = require("../../config.js").xmppServer;
var server      = tcp.createServer();

var createSession = function (socket) {
    var session = new XmppSession(socket);
    socket.on("error", function (err) {
        log.error("%s socket: %s", session.id, err);
    });
    socket.on("close", function (had_error) {
        log.info("%s socket-closed: %s", session.id, had_error);
        socket.removeAllListeners();
        session.terminate();
    });
    session.on("terminate", function () {
        log.info("%s session-termiante destroy socket", session.id);
        socket.removeAllListeners();
        try {
            socket.write("</stream:stream>");
        } catch(ex) {
            log.info("%s writing ex: %s", session.id, ex);
        }
        socket.destroy();
    });
};

server.on("connection", createSession);
server.listen(config.port);