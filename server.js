var http = require('http');
var static = require('node-static');
var io = require('socket.io');
var fs = require('fs');
var path = require('path');
var crypto = require('crypto');
var SonosDiscovery = require('sonos-discovery');
var discovery = new SonosDiscovery();
var settings = {
  port: 8080,
  cacheDir: './cache'
}

try {
  var userSettings = require(path.resolve(__dirname, 'settings.json'));
} catch (e) {
  console.log('no settings file found, will only use default settings');
}

if (userSettings) {
  for (var i in userSettings) {
    settings[i] = userSettings[i];
  }
}

var cacheDir = path.resolve(__dirname, settings.cacheDir);
var missingAlbumArt = path.resolve(__dirname, './lib/browse_missing_album_art.png');

var fileServer = new static.Server(path.resolve(__dirname, 'static'));

var playerIps = [];
var playerCycle = 0;
var queues = {};

fs.mkdir(cacheDir, function (e) {
  if (e && e.code != 'EEXIST')
    console.log('creating cache dir failed!', e);
});



var server = http.createServer(function (req, res) {
  if (/^\/getaa/.test(req.url)) {
    // this is a resource, download from player and put in cache folder
    var md5url = crypto.createHash('md5').update(req.url).digest('hex');
    var fileName = path.join(cacheDir, md5url);

    if (playerIps.length == 0) {
      for (var i in discovery.players) {
        playerIps.push(discovery.players[i].address);
      }
    }

    fs.exists = fs.exists || path.exists;
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
        console.log(res2.statusCode);
        if (res2.statusCode == 200) {
          if (!fs.exists(fileName)) {
            var cacheStream = fs.createWriteStream(fileName);
            res2.pipe(cacheStream);
          } else { res2.resume(); }
        } else if (res2.statusCode == 404) {
          // no image exists! link it to the default image.
          console.log(res2.statusCode, 'linking', fileName)
          fs.link(missingAlbumArt, fileName, function (e) {
            res2.resume();
            if (e) console.log(e);
          });
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
    //console.log(data)
    player[data.state]();
  });

  socket.on('group-volume', function (data) {
    // find player based on uuid
    var player = discovery.getPlayerByUUID(data.uuid);
    if (!player) return;

    // invoke action
    //console.log(data)
    console.log(data.volume)
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
    loadQueue(data.uuid, socket);
  });

  socket.on('seek', function (data) {
    var player = discovery.getPlayerByUUID(data.uuid);
    if (player.avTransportUri.startsWith('x-rincon-queue')) {
      player.seek(data.trackNo);
      return;
    }

    // Player is not using queue, so start queue first
    player.setAVTransportURI('x-rincon-queue:' + player.uuid + '#0', '', function (success) {
      if (success)
        player.seek(data.trackNo, function (success) {
          player.play();
        });
    });
  });

  socket.on('playmode', function (data) {
    var player = discovery.getPlayerByUUID(data.uuid);
    for (var action in data.state) {
      player[action](data.state[action]);
    }
  });

  socket.on('volume', function (data) {
    var player = discovery.getPlayerByUUID(data.uuid);
    player.setVolume(data.volume);
  });

  socket.on('group-mute', function (data) {
    console.log(data)
    var player = discovery.getPlayerByUUID(data.uuid);
    player.groupMute(data.mute);
  });

  socket.on('mute', function (data) {
    var player = discovery.getPlayerByUUID(data.uuid);
    player.mute(data.mute);
  });

  socket.on('track-seek', function (data) {
    var player = discovery.getPlayerByUUID(data.uuid);
    player.trackSeek(data.elapsed);
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

discovery.on('group-mute', function (data) {
  socketServer.sockets.emit('group-mute', data);
});

discovery.on('mute', function (data) {
  socketServer.sockets.emit('mute', data);
});

discovery.on('favorites', function (data) {
  socketServer.sockets.emit('favorites', data);
});

discovery.on('queue-changed', function (data) {
  console.log('queue-changed', data);
  delete queues[data.uuid];
  loadQueue(data.uuid, socketServer.sockets);
});

function loadQueue(uuid, socket) {
  console.time('loading-queue');
  var maxRequestedCount = 600;
  function getQueue(startIndex, requestedCount) {
    console.log('getqueue', startIndex, requestedCount)
    var player = discovery.getPlayerByUUID(uuid);
    player.getQueue(startIndex, requestedCount, function (success, queue) {
      if (!success) return;
      socket.emit('queue', {uuid: uuid, queue: queue});

      if (!queues[uuid] || queue.startIndex == 0) {
        queues[uuid] = queue;
      } else {
        queues[uuid].items = queues[uuid].items.concat(queue.items);
      }

      if (queue.startIndex + queue.numberReturned < queue.totalMatches) {
        getQueue(queue.startIndex + queue.numberReturned, maxRequestedCount);
      } else {
        console.timeEnd('loading-queue');
      }
    });
  }

  if (!queues[uuid]) {
    getQueue(0, maxRequestedCount);
  } else {
    var queue = queues[uuid];
    queue.numberReturned = queue.items.length;
    socket.emit('queue', {uuid: uuid, queue: queue});
    if (queue.totalMatches > queue.items.length) {
      getQueue(queue.items.length, maxRequestedCount);
    }
  }
}

// Attach handler for socket.io

server.listen(settings.port);

console.log("http server listening on port", settings.port);
