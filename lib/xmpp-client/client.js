var Account = require("./lib/account.js").Account;
var TcpTransport = require("./lib/transports/tcp/tcp.js").Tcp;

var count = 1000;
var loggedIn = 0;
var startTime = new Date();
for (var i = 0; i < count; i++) {
    var transport = new TcpTransport({
        host: "localhost",
        port: 5220
    });

    var account = new Account({
        jid: username,
        password: password,
        resource: "loadtest",
        to: "directi.com"
    }, transport);

    account.on("online", function () {
        loggedIn++;
        console.log("logged in: %s, time taken: %s", loggedIn, new Date() - startTime);
        if (loggedIn === count) {
            console.log("Execution time: %s", new Date() - startTime);
        }
    });

    account.on("offline", function (reason) {
        loggedIn++;
        console.log("offline: %s", reason);
        if (loggedIn === count) {
            console.log("Execution time: %s", new Date() - startTime);
        }
    });

    account.login();
}
