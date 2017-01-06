var httpProxy = require('http-proxy');

var logRequest = require('./logging').logRequest

var http_filter = require('./faking_filter').http_filter;
var https_filter = require('./faking_filter').https_filter;
var drop_filter = require('./faking_filter').drop_filter;


//
// The http proxy middleware
//

var http_proxy = httpProxy.createServer();

http_proxy.on('proxyReq', function(proxyReq, request, response, options) {
    logRequest("HTTP", request);
    drop_filter( request, request.connection);
});

http_proxy.on( 'proxyRes', function ( proxyRes, request, response ) {
    http_filter( proxyRes, request, response );
});


//
// The https proxy server
//

var https_proxy = function(request, socket) {
    logRequest("HTTPS", request);
    drop_filter( request, socket );
    https_filter( request, socket );
};

exports.http_proxy = http_proxy
exports.https_proxy = https_proxy
