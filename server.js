var http = require('http');
var static = require('node-static');
var io = require('socket.io');
var fs = require('fs');
var SonosDiscovery = require('sonos-discovery');
var discovery = new SonosDiscovery();
var port = 8080;

var fileServer = new static.Server('./static');

var playerIps = [];
var playerCycle = 0;

fs.mkdir('./cache', function (e) {
  if (e)
    console.log('creating cache dir failed, this is probably normal', e);
});

var server = http.createServer(function (req, res) {

  if (/^\/getaa/.test(req.url)) {
    // this is a resource, download from player and put in cache folder
    var b64url = new Buffer(req.url).toString('base64');
    var fileName = './cache/' + b64url;

    if (playerIps.length == 0) {
      for (var i in discovery.players) {
        playerIps.push(discovery.players[i].address);
      }
    }

    fs.exists(fileName, function (exists) {
      if (exists) {
        var readCache = fs.createReadStream(fileName);
        readCache.pipe(res);
        return;
      }

      var playerIp = playerIps[playerCycle++%playerIps.length];
      console.log('fetching album art from', playerIp);
      http.get({
        hostname: playerIp,
        port: 1400,
        path: req.url
      }, function (res2) {

        if (res2.statusCode == 200) {
          var cacheStream = fs.createWriteStream(fileName);
          res2.pipe(cacheStream);
        } else {
          // no image exists! link it to the default image.
          console.log(res2.statusCode, 'linking', b64url)
          fs.linkSync('./lib/browse_missing_album_art.png', fileName);
          res2.resume();
        }

        res2.on('end', function () {
          console.log('serving', req.url);
          var readCache = fs.createReadStream(fileName);
          readCache.on('error', function (e) {
            console.log(e);
          });
          readCache.pipe(res);
        });
      }).on('error', function(e) {
          console.log("Got error: " + e.message);
        });
    });
  } else {
    req.addListener('end', function () {
          fileServer.serve(req, res);
      }).resume();
  }
});

var socketServer = io.listen(server);
socketServer.set('log level', 1);

socketServer.sockets.on('connection', function (socket) {
  // Send it in a better format
  var players = [];
  var player;
  for (var uuid in discovery.players) {
    player = discovery.players[uuid];
    players.push(player.convertToSimple());
  }

  if (players.length == 0) return;

  socket.emit('topology-change', players);
  player.getFavorites(function (success, favorites) {
    socket.emit('favorites', favorites);
  });

  socket.on('transport-state', function (data) {
    // find player based on uuid
    var player = discovery.getPlayerByUUID(data.uuid);

    if (!player) return;

    // invoke action
    console.log(data)
    player[data.state]();
  });

  socket.on('group-volume', function (data) {
    // find player based on uuid
    var player = discovery.getPlayerByUUID(data.uuid);
    if (!player) return;

    // invoke action
    console.log(data)
    player.groupSetVolume(data.volume);
  });

  socket.on('group-management', function (data) {
      // find player based on uuid
      console.log(data)
      var player = discovery.getPlayerByUUID(data.player);
      if (!player) return;

      if (data.group == null) {
        player.becomeCoordinatorOfStandaloneGroup();
        return;
      }

      player.setAVTransportURI('x-rincon:' + data.group);
  });

  socket.on('play-favorite', function (data) {
    console.log(data)
    var player = discovery.getPlayerByUUID(data.uuid);
    if (!player) return;

    player.replaceWithFavorite(data.favorite, function (success) {
      if (success) player.play();
    });
  });

  socket.on('queue', function (data) {
    function getQueue(startIndex, requestedCount) {
      var player = discovery.getPlayerByUUID(data.uuid);
      player.getQueue(startIndex, requestedCount, function (success, queue) {
        if (!success) return;
        socket.emit('queue', queue);
        if (queue.startIndex + queue.numberReturned < queue.totalMatches) {
          getQueue(queue.startIndex + queue.numberReturned, 100);
        }
      });
    }

    getQueue(0, 100);

  });

  socket.on('seek', function (data) {
    console.log(data)
    var player = discovery.getPlayerByUUID(data.uuid);
    player.seek(data.trackNo);
  });

  socket.on("error", function (e) {
    console.log(e);
  })
});

discovery.on('topology-change', function (data) {
  var players = [];
  for (var uuid in discovery.players) {
    var player = discovery.players[uuid];
    players.push(player.convertToSimple());
  }
  socketServer.sockets.emit('topology-change', players);
});

discovery.on('transport-state', function (data) {
  socketServer.sockets.emit('transport-state', data);
});

discovery.on('group-volume', function (data) {
  socketServer.sockets.emit('group-volume', data);
});

discovery.on('favorites', function (data) {
  socketServer.sockets.emit('favorites', data);
});



// Attach handler for socket.io

server.listen(port);

console.log("http server listening on port", port);
