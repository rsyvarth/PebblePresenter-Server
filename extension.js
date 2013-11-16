var html = '<ul id="msg" style="border: 1px solid #000; background: #eee; width: 500px; word-wrap: break-word; position: absolute; top: 0px; right: 0px;"></ul>';
html += '<script src="http://pebblepresenter.syvarth.com/socket.io/socket.io.js"></script>';
document.getElementsByTagName('body')[0].innerHTML = html + document.getElementsByTagName('body')[0].innerHTML;

var pebblePresenter = {
	init: function(){
		// Initialize the socket connection
		var socket = io.connect();
		pebblePresenter.data = {
			page_url: document.URL,
			pebble_auth: null,
		}

		socket.emit('registerPresentation', pebblePresenter.data);

		socket.on('presentationInfo', function(data){
			pebblePresenter.log(data);
		});

		socket.on('changeSlide', function(data){
			pebblePresenter.log(data);
		});
	},

	log: function( data ) {
		var elem = document.getElementById('msg');
		elem.innerHTML = '<li>'+JSON.stringify(data)+'</li>' + elem.innerHTML;
	}
};

pebblePresenter.init();
