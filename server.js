const http = require('http');
const fs = require('fs');
const fetch = require('node-fetch');
const cheerio = require('cheerio')
const port = process.env.PORT || 3000;

http.createServer(function (req, res) {
    if (req.method === 'GET') {
        var url = req.url;
        if (url === '/') {
            url = '/index.html';
        } else if (url === '/lgtm') {
            res.writeHead(200, {'Content-Type': 'text/json'});
            fetch('http://www.lgtm.in/g')
                .then(function (res) {
                    return res.text()
                })
                .then(function (body) {
                    const $ = cheerio.load(body)
                    res.end($('#imageUrl').val());
                });
            return;
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
}).listen(port);
console.log('Start server. port:' + port);

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