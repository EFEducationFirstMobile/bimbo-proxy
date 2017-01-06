var httpProxy = require('http-proxy');
var url = require('url');
var net = require('net');
var path = require('path');

//
// Sample fake responses
//

var results_by_regex = {}
results_by_regex['test-html-200'] = {
    status: 200,
    text: '<html><body>Hello, world!</body></html>',
    type: 'text/html'
}

results_by_regex['test-json-201'] = {
    status: 201,
    text: '{"created": true, "message": "Hello, world!", "value": 42}',
    type: 'application/json',
    headers: [{
        "name": "cache-control",
        "value": "no-cache"
    }, {
        "name": 'etag'
    }]
}

results_by_regex['test-error-500'] = {
    status: 500,
    text: 'Ooops! Something bad happend :(\n',
    type: 'application/text'
}

results_by_regex['test-error-599'] = {
    status: 599
}


//
// Request filtering functions
//

var isRequestHttpsCompatible = function(result) {
    return result.status < 500;
}

var isRequestDrop = function(result) {
    return result.status == 999;
}


//
// Simple rules management
//
var rules_handler = function(request, response) {
    var regex = request.url.substring(request.url.indexOf('rules') + 'rules'.length + 1);
    if (regex === undefined || regex.length == 0) {
        respond(response, 400, '{"error":"no regex specified in the path"}');
        return
    }

    if (request.method == 'POST') {
        parse_post(request, function(data) {
            results_by_regex[regex] = JSON.parse(data);
            console.log('rule added for regex "%s": %s', regex, data);
            respond(response, 201, '{"regex":"' + regex + '", "result":"' + data + '"}');
        });
    } else if (request.method == 'DELETE') {
        if (results_by_regex[regex] != undefined) {
            delete results_by_regex[regex]
            console.log('rule removed for regex "%s"', regex);
            respond(response, 200, '{"regex":"' + regex + '"}, "deleted":true}');
        } else {
            respond(response, 404);
        }
    } else {
        respond(response, 405);
    }
};


//
// The https faking filter
//

var https_filter = function(request, socket) {
    if (request.dropped) {
        return;
    }

    var result = find_result(request, isRequestHttpsCompatible);
    if (!result) {
        var serverUrl = url.parse('https://' + request.url);
        var srvSocket = net.connect(serverUrl.port, serverUrl.hostname, function() {
            socket.write(
                'HTTP/1.1 200 Connection Established\r\n' +
                'Proxy-agent: bimbo-proxy\r\n' +
                '\r\n');
            srvSocket.pipe(socket);
            socket.pipe(srvSocket);
        });
    } else {
        console.log("Response to %s will be faked to %s", request.url, JSON.stringify(result))
            // socket.write("HTTP/" + req.httpVersion + " 500 Connection error\r\n\r\n");
            // socket.end();
        socket.write('HTTP/' + request.httpVersion + ' ' + result.status + ' ' + result.text + '\r\n');
        socket.write('Proxy-agent: bimbo-proxy\r\n');

        if (result.headers) {
            result.headers.forEach(function(header) {
                socket.write(header.name + ': ' + header.value + '\r\n');
            });
        }

        socket.write('\r\n');
        socket.end();
    }
}


//
// The http faking filter
//

var http_filter = function(proxyRes, request, response) {
    if (request.dropped) {
        return;
    }

    var content,
        _write = response.write;
    _writeHead = response.writeHead;

    var result = find_result(request, negate(isRequestDrop));

    response.writeHead = function() {
        response.setHeader('x-bimbo-proxy', 'true');
        if (result) {
            console.log("Response to %s will be faked to %s", request.url, JSON.stringify(result))

            response.setHeader('x-bimbo-faked', 'true');
            delete_header(response, 'transfer-encoding');
            delete_header(response, 'content-encoding');

            if (result.text) {
                response.setHeader('Content-Length', result.text.length);
                response.setHeader('Content-Type', result.type + '; charset=utf-8')
            }
            var headers = result.headers;

            if (headers) {
                headers.forEach(function(header) {
                    if (header.value) {
                        response.setHeader(header.name, header.value);
                    } else {
                        delete_header(response, header.name);
                    }
                });
            }

            _writeHead.apply(this, [result.status, {}]);
        } else {
            _writeHead.apply(this, arguments);
        }
    }

    response.write = function(data) {
        if (!result) {
            _write.apply(response, arguments);
        } else if (result.text) {
            _write.apply(response, [result.text.toString()]);
        }
    };
}


//
// The dropping filter
//

var drop_filter = function(request, socket) {
    var result = find_result(request, isRequestDrop);
    if (result) {
        console.log("Response to %s will be dropped", request.url, JSON.stringify(result))
        socket.end();
        request.dropped = true;
    }
}


//
// Support functions
//

var respond = function(response, code, message) {
    response.statusCode = code;
    if (message != undefined) {
        response.setHeader('Content-type', 'application/json');
        response.write(message);
    }
    response.end();
}

var parse_post = function(request, callback) {
    var data = '';
    request.on('data', function(chunk) {
        data += chunk;
    });
    request.on('end', function() {
        callback(data);
    });
}

// TODO: we should make it work lowercase and maybe
// we do have a real function to do that, right?
var delete_header = function(response, name) {
    delete response._headers[name];
    delete response._headerNames[name];
}

var find_result = function(request, criteria) {
    for (var regex in results_by_regex) {
        if (results_by_regex.hasOwnProperty(regex)) {
            var found = new RegExp(regex).test(request.url);
            if (found) {
                var result = results_by_regex[regex]
                if (criteria(result)) {
                    return result;
                }
            }
        }
    }

    return undefined;
};

function negate(func) {
    return function(x) {
        return !func(x);
    };
}

//
// Exports!
//

exports.http_filter = http_filter;
exports.https_filter = https_filter;
exports.drop_filter = drop_filter;
exports.rules_handler = rules_handler;
