The goal of this framework is to enable simple and robust testing of
bosh.

* Flow between the client and server.
  * client sends a session/stream create to the bosh-server.
  * bosh connects to xmpp-stub-server.js through lookup-stub-server.js
  * bosh sends initial stream:stream to xmpp-stub-server.js
  * xmpp-stub-server.js replies with stream:stream
  * after this the client and the server can exchange 
    whatever messages(not xmpp) - just xml. 

* The design should be simple.
  * /lib should provide various methods to write tests.
  * /tests will have various functional tests.
  * we can have a complete login procedure for an account as part of
    the functional test.
  
* Design
  * /lib consits of three modules
    * lookup-stub-server.js
    * xmpp-stub-server.js
    * bosh-client.js
  * Before running the tests, start lookup-stub-server and
    xmpp-stub-server.
  * Each test file, should require these modules and inject various
    config(request/response).
    
* lookup-stub-server.js
  * reads the config file(config.js by default).
  * bosh proxy needs to be configured to use this lookup-server.
  * starts the server on port mentioned in the config file.
  * returns host:port of service-type mentioned in the config.
    - this should either by the address of xmpp-stub-server.js or a
    real xmpp server address.

* xmpp-stub-server.js
  * config 
    - port 7236
  * when the client connects to the xmpp-server, it needs to specify
  the following
      load     : sends back N times watever is received.
      roster   : # of elements in the roster
      message  : # of messages/min received by the .
      presence : # of presence packets.

  * the client does this by sending the following packet after the
    stream is established.
    * <session load="2" roster="100" presence="200" message="5" />

* bosh-client.js
  * this is a bosh-client with some special/custom functions.
  * create a session = new BOSHSession(port, host);
  * api
    * runs in two mode - custom/client
    * custom mode means all the requests will be made by you
    * client mode will ensure proper working client.
    * newStream({opening stream-attrs}) returns a stream obj.
    opening stream-attrs must contain a from element to identify the
    stream creation response from the server.
    * 
