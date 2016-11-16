var connect = require('connect');
var http = require('http');
var url = require('url');

var http_proxy = require('./proxies').http_proxy;
var https_proxy = require('./proxies').https_proxy;
var rules_handler = require('./faking_filter').rules_handler;

var port = (process.argv.length > 2) ? parseInt(process.argv[2], 10) : 8888


//
// Proxy server
//

var proxy_app = connect();
var server = http.createServer(proxy_app);

proxy_app.use(function(request, response) {
    url_parts = url.parse(request.url, true);
    if (url_parts.pathname.startsWith('/admin/rules')) {
        rules_handler(request, response);
    } else {
        http_proxy.web(request, response, {
            target: request.url,
            secure: false,
            prependPath: false
        });
    }
});

server.on('connect', https_proxy);
server.listen(port, function() {
    console.log("Proxy server running on port " + port)
});
