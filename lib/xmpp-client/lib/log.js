var log4js = require("log4js");

log4js.configure({
    doNotReplaceConsole: true
});

var appender = log4js.appenders.console(log4js.basicLayout);
log4js.clearAppenders();
log4js.addAppender(appender);
log4js.setGlobalLogLevel("info");

module.exports = log4js;
