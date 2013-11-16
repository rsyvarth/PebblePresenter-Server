// // Include needed packages (socket.io and express)
// var express = require('express');
// var app = express()
//   , http = require('http')
//   , server = http.createServer(app)
//   , io = require('socket.io').listen(server);
// // REPLACE BELOW var port = var port = process.env.PORT || 8080;
// // Allow connections on port 8080, or the environment port number
// var port = process.env.PORT || 1337;
// // At the time of this writing, WebSockets is not supported
// // in Windows Azure Web Sites, which will force socket.io
// // to fall back to a different communication protocol
// // Prevent potential problems by specifying one, in this case, xhrpolling
// // io.set('transports', ['xhrpolling']);
// // Listen for incoming requests
// server.listen(port);
// // Redirect request to index.html

// app.get('/', function (req, res) {
//   res.sendfile(__dirname + '/index.html');
// }).get('/presentationInfo', function (req, res) {
//   res.sendfile(__dirname + '/index.html');
// });

// // When connected and sendmessage is called by client,
// // broadcast data sent by one client to all connected clients



//setup Dependencies
var express = require('express');
var app = express()
	, http = require('http')
	, server = http.createServer(app)
	, io = require('socket.io').listen(server)
	, port = (process.env.PORT || 1337);

//Setup Express
server.listen( port );

//Setup Socket.IO
io.sockets.on('connection', function (socket) {

	socket.on('sendmessage', function (data) {
		socket.broadcast.emit('displaymessage', data);
		socket.emit('displaymessage',data);
	});

	socket.on('disconnect', function(){
    	console.log('Client Disconnected.');
    });
});


///////////////////////////////////////////
//              Routes                   //
///////////////////////////////////////////

/////// ADD ALL YOUR ROUTES HERE  /////////

app.get('/', function(req,res){
  res.sendfile(__dirname + '/index.html');
});

app.get('/getPresentation/:pebbleId', function(req,res){
	var info = API.getSlideInfo(req);
	res.send(JSON.stringify(info));
});


//A Route for Creating a 500 Error (Useful to keep around)
app.get('/500', function(req, res){
	throw new Error('This is a 500 Error');
});

//The 404 Route (ALWAYS Keep this as the last route)
app.get('/*', function(req, res){
	throw new NotFound;
});

function NotFound(msg){
	this.name = 'NotFound';
	Error.call(this, msg);
	Error.captureStackTrace(this, arguments.callee);
}


console.log('Listening on http://0.0.0.0:' + port );

///////////////////////////////////////////
//              API Functions            //
///////////////////////////////////////////
var API = {
	getSlideInfo: function(req) {
		return {
			test: 'Hello World',
			pebble: req.params.pebbleId
		}
	},
}