var http = require('http');
var fs = require('fs');

http.createServer(function (req, res) {
    if (req.method === 'GET') {
        var url = req.url;
        if (url === '/') {
            url = '/index.html';
        }
        fs.readFile(__dirname + url, 'utf-8', function (err, data) {
            if (err) {
                console.log(err);
                res.writeHead(404, { 'Content-Type': 'text/plain' });
                res.end('not found');
                return;
            }
            var mimeType = getContentType(url);
            res.writeHead(200, { 'Content-Type': mimeType });
            if (mimeType.includes('image')) {
                res.end(fs.readFileSync('.' + url), 'binary');
            } else {
                res.end(data);
            }
        });
    } else {
        res.statusCode = 404;
        res.end('not found');
    }
}).listen(process.env.PORT);
console.log('Start server. port:' + process.env.PORT);

function getContentType(url) {
    var suffix = url.substr(url.lastIndexOf('.') + 1);
    switch (suffix) {
        case 'html':
            return 'text/html';
        case 'js':
            return 'text/javascript';
        case 'css':
            return 'text/css';
        case 'png':
            return 'image/png';
        case 'jpeg':
        case 'jpg':
            return 'image/jpeg';
        case 'ico':
            return 'image/vnd.microsoft.icon';
        default:
            return 'text/plain';
    }
}
