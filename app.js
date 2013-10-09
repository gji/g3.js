var express = require('express')
, routes = require('./routes')
, user = require('./routes/user')
, http = require('http')
, path = require('path')
, request = require('request')
, microtime = require('microtime');

var app = express();

// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(app.router);
app.use(require('stylus').middleware(__dirname + '/public'));
app.use(express.static(path.join(__dirname, 'public')));

// development only
if ('development' == app.get('env')) {
    app.use(express.errorHandler());
}

var DataManager = require('./dataManager').DataManager;
var dataManagerService = new DataManager(app);

http.createServer(app).listen(app.get('port'), function(){
    console.log('Express server listening on port ' + app.get('port'));
});

var count = 1;
setInterval(function () {
    request.post({url:'http://localhost:3000/data/',json:{time:microtime.nowDouble(), data:Math.random()}}, function (error, response, body) {
	if (!error && response.statusCode == 200) {
	    console.log("Added random data");
	}
    })
    count++;
}, 3000);
