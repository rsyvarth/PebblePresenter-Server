
//setup Dependencies
var express = require('express');
var app = express()
	, http = require('http')
	, server = http.createServer(app)
	, io = require('socket.io').listen(server)
	, port = (process.env.PORT || 1337)
	, mysql = require('mysql')
	, presNodes = {}
	, presSockets = {};

var connection = mysql.createConnection({
  host     : (process.env.PORT) ? 'us-cdbr-azure-west-b.cleardb.com' : 'localhost',
  user     : (process.env.PORT) ? 'bc151e5a3651a6' : 'root',
  password : (process.env.PORT) ? '8c60e8e9' : '',
  database: 'pebblepAX8b7nf8s',
});
connection.connect();

//Setup Express
app.use(express.json());
app.use(express.urlencoded());
server.listen( port );

// io.set('transports', [
//     'websocket'
//   , 'flashsocket'
//   , 'htmlfile'
//   , 'xhr-polling'
//   , 'jsonp-polling'
// ]);

//Setup Socket.IO
io.sockets.on('connection', function (socket) {

	socket.on('registerPresentation', function (data) {
		console.log('Registering Presentation', data);
		API.getSlidesByPage( data.page_url, function(info){
			presNodes[ info.pres_id ] = {
				socket: socket,
				data: info
			};
			console.log('Presentation Connected: ', info.pres_id, info);
			socket.emit('presentationInfo',info);
		});
	});

	socket.on('sendmessage', function (data) {
		socket.broadcast.emit('displaymessage', data);
		socket.emit('displaymessage',data);
	});

	socket.on('updatePresentation', function(data){
		req = {
			body: {
				page_url: data.page_url,
				pebble_auth: data.pebble_auth
			}
		};
		API.updateSlides(req, function(ret){
			console.log('Returning page', ret);
			socket.emit('presentationInfo',ret);
		});
	});

	// socket.on('sendmessage', function (data) {
	// 	socket.broadcast.emit('displaymessage', data);
	// 	socket.emit('changeSlide',data);
	// });

	socket.on('disconnect', function(){
		delete presSockets[ socket.id ];
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

app.get('/extension.js', function(req,res){
  res.sendfile(__dirname + '/extension.js');
});

app.get('/getPresentationPebble/', function(req,res){
	API.getSlideByPebble(req, function(ret){
		console.log('Returning page', ret);
		res.send(JSON.stringify(ret));
	});
});

app.get('/getPresentationPebble/:pebbleId', function(req,res){
	API.getSlideByPebble(req, function(ret){
		console.log('Returning page', ret);
		res.send(JSON.stringify(ret));
	});
});

app.get('/changeSlide/:pebbleId/:direction', function(req,res){
	API.changeSlide(req, function(ret){
		res.send(JSON.stringify(ret));
	});
});

app.post('/updatePresentation', function(req,res){
	API.updateSlides(req, function(ret){
		console.log('Returning page', ret);
		res.send(JSON.stringify(ret));
	});
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
	getSlideByPebble: function(req, cb) {
		var data = null;
		console.log('Getting slide info');
		if( req.params.pebbleId > 0 ) {
			connection.query('SELECT * from presentations where pebble_id = ?', [req.params.pebbleId], function(err, rows, fields) {
				if (err) throw err;
				data = rows[0];

				if( data && data.pres_id > 0 ) {
					console.log('Returning data', data);
					cb( data );
				} else {
					API.getAuthId( req.params.pebbleId, function(info){
						cb( info );
					});
				}
			});
		} else {
			API.getAuthId( 0, function(info){
				cb( info );
			});
		}
	},

	getAuthId: function(pebbleId, cb) {
		console.log('Get auth id');

		// connection.query('DELETE from pebbles where pebble_id = ?', [pebbleId], function(err, rows, fields) {
		// 	if (err) throw err;
			var data = {
				auth_key: API.generateAuthKey(),
				generated: Math.floor(+new Date()/1000)
			};

			if( pebbleId ) {
				data.pebble_id = pebbleId;
			}

			connection.query('INSERT into pebbles SET ? ON DUPLICATE KEY UPDATE ?', [data,data], function(err, result) {
				if (err) throw err;
				data.pebble_id = result.insertId;
				console.log('Return auth', data);
				cb( data );
			});

		//});
	},

	changeSlide: function(req, cb) {
		console.log('Change slide');

		var pebble_id = req.params.pebbleId;
		var dir = req.params.direction;

		connection.query('SELECT * from presentations where pebble_id = ?', [pebble_id], function(err, rows, fields) {
			if (err) throw err;
			var data = rows[0];

			console.log(data, pebble_id);
			if( data && data.pres_id && presNodes[ data.pres_id ] ) {
				presNodes[ data.pres_id ].socket.emit('changeSlide',{direction:dir});
				cb(true);
			} else {
				cb(false);
			}
		});
	},

	updateSlides: function(req, cb) {

		console.log('Updating slide info');

		var data = null
			, page_hash = API.generatePageHash( req.body.page_url )
			, pebble_id = 0
			, config = req.body.config;


		connection.query('SELECT * from presentations where page_hash = ?', [page_hash], function(err, rows, fields) {
			if (err) throw err;
			data = rows[0];

			if( data && data.pres_id > 0 ) {
				if( !data.pebble_id || req.body.pebble_auth ) {
					API.matchPebbleAuth( req.body.pebble_auth, function(id){
						if( !id ) {
							cb({status:'error',code:'E_AUTH_FAILED'});
						} else {
							pebble_id = id;
							connection.query('UPDATE presentations SET pebble_id = 0 WHERE pebble_id = ?', [pebble_id], function(err, result) {
								if (err) throw err;
								connection.query('UPDATE presentations SET pebble_id = ?, config = ?, updated = ? WHERE page_hash = ?', [pebble_id, config, Math.floor(+new Date()/1000), page_hash], function(err, result) {
									if (err) throw err;
									cb({status:'success'});
								});
							});
						}
					});
				} else {
					connection.query('UPDATE presentations SET config = ?, updated = ? WHERE page_hash = ?', [config, Math.floor(+new Date()/1000), page_hash], function(err, result) {
						if (err) throw err;
						cb({status:'success'});
					});
				}
			} else {
				API.matchPebbleAuth( req.body.pebble_auth, function(id){
					if( !id ) {
						cb({status:'error',code:'E_AUTH_FAILED'});
					} else {
						pebble_id = id;
						var data = {
							page_hash: page_hash,
							pebble_id: pebble_id,
							config: config,
							created: Math.floor(+new Date()/1000),
							updated: Math.floor(+new Date()/1000),
						};

						connection.query('UPDATE presentations SET pebble_id = 0 WHERE pebble_id = ?', [pebble_id], function(err, result) {
							if (err) throw err;
							connection.query('INSERT INTO presentations SET ?', data, function(err, result) {
								if (err) throw err;
								cb({status:'success'});
							});
						});
					}
				});
			}
		});
	},

	getSlidesByPage: function(page_url, cb) {
		console.log('Get slide info');

		var page_hash = API.generatePageHash( page_url );

		connection.query('SELECT * from presentations where page_hash = ?', [page_hash], function(err, rows, fields) {
			if (err) throw err;
			data = rows[0];

			if( data && data.pres_id > 0 ) {
				cb(data);
			} else {
				var data = {
					page_hash: page_hash,
					pebble_id: 0,
					config: '',
					created: Math.floor(+new Date()/1000),
					updated: Math.floor(+new Date()/1000),
				}
				connection.query('INSERT INTO presentations SET ?', data, function(err, result) {
					if (err) throw err;
					data.pres_id = result.insertId;
					cb(data);
				});
			}
		});
	},

	generateAuthKey: function() {
		time = +new Date();
		decimal = parseInt((time/10000 - parseInt(time/10000))*1000000);
		return decimal.toString(36).toUpperCase();
	},

	generatePageHash: function( url ) {
		if( url ) {
			var part = url.split('#');
			return require('crypto').createHash('md5').update(part[0]).digest("hex");
		} else {
			return false;
		}
	},

	matchPebbleAuth: function( pebbleAuth, cb ) {
		connection.query('SELECT * from pebbles where auth_key = ?', [pebbleAuth], function(err, rows, fields) {
			if (err) throw err;
			data = rows[0];

			if( data && data.pebble_id > 0 ) {
				cb( data.pebble_id );
			} else {
				cb( 0 );
			}
		});
	}
}