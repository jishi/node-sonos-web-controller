'use strict';
const http = require('http');
const StaticServer = require('node-static').Server;
const io = require('socket.io');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const async = require('async');
const SonosDiscovery = require('sonos-discovery');
const settings = {
  port: 8080,
  cacheDir: './cache'
}

try {
  const userSettings = require(path.resolve(__dirname, 'settings.json'));
  for (var i in userSettings) {
    settings[i] = userSettings[i];
  }
} catch (e) {
  console.log('no settings file found, will only use default settings');
}

var discovery = new SonosDiscovery(settings);

var cacheDir = path.resolve(__dirname, settings.cacheDir);
var missingAlbumArt = path.resolve(__dirname, './lib/browse_missing_album_art.png');

var fileServer = new StaticServer(path.resolve(__dirname, 'static'));

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

    fs.exists(fileName, function (exists) {
      if (exists) {
        var readCache = fs.createReadStream(fileName);
        readCache.pipe(res);
        return;
      }

      const player = discovery.getAnyPlayer();
      if (!player) return;

      console.log('fetching album art from', player.localEndpoint);
      http.get(`${player.baseUrl}${req.url}`, function (res2) {
        console.log(res2.statusCode);
        if (res2.statusCode == 200) {
          if (!fs.exists(fileName)) {
            var cacheStream = fs.createWriteStream(fileName);
            res2.pipe(cacheStream);
          } else {
            res2.resume();
          }
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
      }).on('error', function (e) {
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

socketServer.sockets.on('connection', function (socket) {
  // Send it in a better format
  const players = discovery.players;

  if (players.length == 0) return;

  socket.emit('topology-change', players);
  discovery.getFavorites()
    .then((favorites) => {
      socket.emit('favorites', favorites);
    });

  socket.on('transport-state', function (data) {
    // find player based on uuid
    const player = discovery.getPlayerByUUID(data.uuid);

    if (!player) return;

    // invoke action
    //console.log(data)
    player[data.state]();
  });

  socket.on('group-volume', function (data) {
    // find player based on uuid
    const player = discovery.getPlayerByUUID(data.uuid);
    if (!player) return;

    // invoke action
    player.setGroupVolume(data.volume);
  });

  socket.on('group-management', function (data) {
    // find player based on uuid
    console.log(data)
    const player = discovery.getPlayerByUUID(data.player);
    if (!player) return;

    if (data.group == null) {
      player.becomeCoordinatorOfStandaloneGroup();
      return;
    }

    player.setAVTransport(`x-rincon:${data.group}`);
  });

  socket.on('play-favorite', function (data) {
    var player = discovery.getPlayerByUUID(data.uuid);
    if (!player) return;

    player.replaceWithFavorite(data.favorite)
      .then(() => player.play());
  });

  socket.on('queue', function (data) {
    loadQueue(data.uuid)
      .then(queue => {
        socket.emit('queue', { uuid: data.uuid, queue });
      });
  });

  socket.on('seek', function (data) {
    var player = discovery.getPlayerByUUID(data.uuid);
    if (player.avTransportUri.startsWith('x-rincon-queue')) {
      player.trackSeek(data.trackNo);
      return;
    }

    // Player is not using queue, so start queue first
    player.setAVTransport('x-rincon-queue:' + player.uuid + '#0')
      .then(() => player.trackSeek(data.trackNo))
      .then(() => player.play());
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
    if (data.mute)
      player.muteGroup();
    else
      player.unMuteGroup();
  });

  socket.on('mute', function (data) {
    var player = discovery.getPlayerByUUID(data.uuid);
    if (data.mute)
      player.mute();
    else
      player.unMute();
  });

  socket.on('track-seek', function (data) {
    var player = discovery.getPlayerByUUID(data.uuid);
    player.timeSeek(data.elapsed);
  });

  socket.on('search', function (data) {
    search(data.term, socket);
  });

  socket.on("error", function (e) {
    console.error(e);
  })
});

discovery.on('topology-change', function (data) {
  socketServer.sockets.emit('topology-change', discovery.players);
});

discovery.on('transport-state', function (data) {
  socketServer.sockets.emit('transport-state', data);
});

discovery.on('group-volume', function (data) {
  socketServer.sockets.emit('group-volume', data);
});

discovery.on('volume-change', function (data) {
  socketServer.sockets.emit('volume', data);
});

discovery.on('group-mute', function (data) {
  socketServer.sockets.emit('group-mute', data);
});

discovery.on('mute-change', function (data) {
  socketServer.sockets.emit('mute', data);
});

discovery.on('favorites', function (data) {
  socketServer.sockets.emit('favorites', data);
});

discovery.on('queue-changed', function (data) {
  console.log('queue-changed', data);
  delete queues[data.uuid];
  loadQueue(data.uuid)
    .then(queue => {
      socket.emit('queue', { uuid: data.uuid, queue });
    });
});

function loadQueue(uuid) {
  if (queues[uuid]) {
    return Promise.resolve(queues[uuid]);
  }

  const player = discovery.getPlayerByUUID(uuid);
  return player.getQueue()
    .then(queue => {
      queues[uuid] = queue;
      return queue;
    });
}

function search(term, socket) {
  console.log('search for', term)
  var playerCycle = 0;
  var players = [];

  for (var i in discovery.players) {
    players.push(discovery.players[i]);
  }

  function getPlayer() {
    var player = players[playerCycle++ % players.length];
    return player;
  }

  var response = {};

  async.parallelLimit([
    function (callback) {
      var player = getPlayer();
      console.log('fetching from', player.address)
      player.browse('A:ARTIST:' + term, 0, 600, function (success, result) {
        console.log(success, result)
        response.byArtist = result;
        callback(null, 'artist');
      });
    },
    function (callback) {
      var player = getPlayer();
      console.log('fetching from', player.address)
      player.browse('A:TRACKS:' + term, 0, 600, function (success, result) {
        response.byTrack = result;
        callback(null, 'track');
      });
    },
    function (callback) {
      var player = getPlayer();
      console.log('fetching from', player.address)
      player.browse('A:ALBUM:' + term, 0, 600, function (success, result) {
        response.byAlbum = result;
        callback(null, 'album');
      });
    }
  ], players.length, function (err, result) {

    socket.emit('search-result', response);
  });
}

// Attach handler for socket.io

server.listen(settings.port);

console.log("http server listening on port", settings.port);
