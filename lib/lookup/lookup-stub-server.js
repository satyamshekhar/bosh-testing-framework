var tav    = require("tav");
var util   = require("util");
var app    = require("express")();

var conf_path = tav.set({
    config: {
        value : "./config.js",
        note  : "config file to use"
    }
}).config;

var config = require(conf_path).lookup;

app.get("/lookup", function (req, res) {
    if (config[req.query["service-type"]]) {
        var tcpAddr = {
            "tcp-addr": config[req.query["service-type"]]
        };
        var resObj = {
            info: JSON.stringify(tcpAddr)
        };
        res.send(JSON.stringify(resObj));
    } else {
        res.send("Invalid Request");
    }
});

app.listen(config.port);
