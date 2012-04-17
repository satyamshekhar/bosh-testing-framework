var tcp = require("net");
var log = require("log4js").getLogger("simple-test.js");
var socket = new tcp.Socket();

socket.on("data", function (d){
    log.debug("RECV: %s", d);
});

socket.on("connect", function () {
    socket.write("<stream:stream from='satyam.s@directi.com'>");
    socket.write("<session load='1' message='60' roster='10' presence='20' />");
});

socket.connect(3663);