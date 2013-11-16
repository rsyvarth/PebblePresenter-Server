// Include needed packages (socket.io and express)
var express = require('express');
var app = express()
  , http = require('http')
  , server = http.createServer(app)
  , io = require('socket.io').listen(server);
// REPLACE BELOW var port = var port = process.env.PORT || 8080;
// Allow connections on port 8080, or the environment port number
var port = process.env.PORT || 1337;
// At the time of this writing, WebSockets is not supported
// in Windows Azure Web Sites, which will force socket.io
// to fall back to a different communication protocol
// Prevent potential problems by specifying one, in this case, xhrpolling
io.set('transports', ['xhrpolling']);
// Listen for incoming requests
server.listen(port);
// Redirect request to index.html
app.get('/', function (req, res) {
  res.sendfile(__dirname + '/index.html');
});
// When connected and sendmessage is called by client,
// broadcast data sent by one client to all connected clients
io.sockets.on('connection', function (socket) {
  // When the client emits 'sendmessage,' the following method is triggered
  socket.on('sendmessage', function (data) {
    // Message is broadcast to all clients
    socket.broadcast.emit('displaymessage', data);
  });
});
