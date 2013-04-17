var http = require('http');
var static = require('node-static');
var io = require('socket.io');
var SonosDiscovery = require('sonos-discovery');
var discovery = new SonosDiscovery();
var port = 8080;

var fileServer = new static.Server('./static');

var server = http.createServer(function (req, res) {
	
	req.addListener('end', function () {
        fileServer.serve(req, res);
    });	
});

var socketServer = io.listen(server);

socketServer.sockets.on('connection', function (socket) {
	socket.emit('topology-change', discovery.getZones());
  	socket.on('transport-state', function (data) {
	    // find player based on uuid
	    var player = discovery.getPlayerByUUID(data.uuid);

	    if (!player) return;

	    // invoke action
	    console.log(data)
	    player[data.state]();
  	});
});

discovery.on('topology-change', function (data) {
	socketServer.sockets.emit('topology-change', data);
});

// Attach handler for socket.io

server.listen(port);

console.log("http server listening on port", port);
