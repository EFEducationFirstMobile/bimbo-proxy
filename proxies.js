var httpProxy = require('http-proxy');
var url = require('url');
var net = require('net');
var util = require('util');

var logRequest = require('./logging').logRequest
var logResponse = require('./logging').logResponse

var filter = require('./faking_filter').filter;

//
// The proxy middleware
//

var http_proxy = httpProxy.createServer();

http_proxy.on('proxyReq', function(proxyReq, request, response, options) {
    logRequest("HTTP", request);
});

http_proxy.on( 'proxyRes', function ( proxyRes, request, response ) {
    filter( proxyRes, request, response );
});


//
// The proxy server
//

var https_proxy = function(req, socket) {
    logRequest("HTTPS", req);

    var serverUrl = url.parse('https://' + req.url);
    var srvSocket = net.connect(serverUrl.port, serverUrl.hostname, function() {
        socket.write(
            'HTTP/1.1 200 Connection Established\r\n' +
            'Proxy-agent: Node-Proxy\r\n' +
            '\r\n');
        srvSocket.pipe(socket);
        socket.pipe(srvSocket);
    });
};


exports.http_proxy = http_proxy
exports.https_proxy = https_proxy
