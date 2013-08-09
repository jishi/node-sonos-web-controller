var http = require('http')
	,	static = require('node-static')
	,	io = require('socket.io')
	,	SonosDiscovery = require('sonos-discovery')
	,	discovery = new SonosDiscovery()
	,	port = process.env.PORT || 8080
	;

// Instantiate static file server
var fileServer = new static.Server('./public')

// Spin up http server and listen on proper port
var server = http.createServer(function(req, res){
	
	req.addListener('end', function(){
		fileServer.serve(req, res)
   }).resume()

}).listen(port)


// Instantiate socket.io server
var socketServer = io.listen(server)

socketServer.sockets.on('connection', function (socket){
	
	socket.emit('topology-change', discovery.getZones())

	socket.on('transport-state', function (data) {
	    // find player based on uuid
	    var player = discovery.getPlayerByUUID(data.uuid)

	    if (!player) return

	    // invoke action
	    console.log(data)

	    player[data.state]()
  	})

})

discovery.on('topology-change', function (data) {
	socketServer.sockets.emit('topology-change', data)
})

console.log("HTTP Server Listening on Port", port)
