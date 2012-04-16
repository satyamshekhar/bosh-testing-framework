function PacketHandler(session) {
    this._session = session;
}

PacketHandler.prototype.consume = function () {};

module.exports = PacketHandler;