//
// General logging functions
//

function truncate(str) {
    var maxLength = 200;
    return (str.length >= maxLength ? str.substring(0, maxLength) + '...' : str);
}

function logRequest(title, req) {
    console.log(title + " " + req.method + ' ' + truncate(req.url));
    for (var i in req.headers)
        console.log(' * ' + i + ': ' + truncate(req.headers[i]));
}

function logResponse(title, res) {
    console.log(title + " " + res.method + ' ' + truncate(req.url));
    for (var i in req.headers)
        console.log(' * ' + i + ': ' + truncate(req.headers[i]));
}

function logError(e) {
    console.warn('**************************************************************** ' + e + ' ****************************************************************');
    console.warn(e.stack);
    console.warn('****************************************************************************************');
}

exports.logRequest = logRequest
exports.logResponse = logRequest

process.on('uncaughtException', logError);
