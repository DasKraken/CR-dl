const { UserInputException, RuntimeException, NetworkException } = require("./Exceptions");
const rp = require("request-promise-native");
const request = require("request");
var async = require("async");
var fs = require("fs");
/*

function makeIterator(array) {
    var nextIndex = 0;

    return {
        next: function () {
            return nextIndex < array.length ?
                array[nextIndex++] :
                undefined;
        }
    };
}
function parseValueList(line) {
    let valList = line.substring(line.indexOf(":") + 1);
    const listData = {};
    const regex = /([^=,]+)=(([^,"]+)|"([^"]+)")/g;
    let m;
    while ((m = regex.exec(valList)) !== null) {
        listData[m[1]] = m[3] || m[4];
    }
    return listData;
}
async function downloadVideoFromM3U(url, dest, options) {
    options = options || {};
    options.uri = url;
    const m3uData = (await rp(options)).toString();
    const m3uLines = m3uData.split(/[\r\n]+/)

    const streams = [];
    const sequence = [];
    let key;

    const linesIterator = makeIterator(m3uLines);
    let line = ""
    while (line = linesIterator.next()) {
        if (line.startsWith("#EXTM3U")) {
        } else if (line.startsWith("#EXT-X-STREAM-INF:")) {
            const streamInfo = parseValueList(line);
            streamInfo.url = linesIterator.next();
            streams.push(streamInfo);
            console.log(streamInfo);
        } else if (line.startsWith("#EXT-X-KEY:")) {
            key = parseValueList(line);
        }
    }
}
*/


var m3u8 = require('m3u8');

function parseM3U(data) {
    return new Promise((resolve, reject) => {
        var parser = m3u8.createStream();

        parser.on('item', function (item) {

        });
        parser.on('m3u', function (m3u) {
            resolve(m3u);
            // fully parsed m3u file
        });
        parser.on('error', function (err) {
            reject(err);
        });
        parser.write(data)
        parser.end();
    })
}

function getFilenameFromURI(uri) {
    return decodeURI(uri.match(/\/([^/?]+)(?:\?.*)?$/)[1])
}

function downloadFile(uri, dest) {
    return new Promise((resolve, reject) => {
        request(uri, { forever: true, timeout: 20000 }).on("error", (e) => {
            reject(new NetworkException(e.message));
        }).on("response", (response) => {
            if (response.statusCode != 200) {
                reject(new NetworkException("HTTP status code: " + (response.statusCode)));
            }
        }).pipe(fs.createWriteStream(dest)).on("finish", resolve);
    });
}

async function downloadVideoFromM3U(url, dest, options) {
    options = options || {};
    options.connections = options.connections || 20;
    const m3u = (await rp(url)).toString();
    const m3uData = await parseM3U(m3u);
    if (m3uData.items.StreamItem.length > 0) { // Stream List
        await downloadVideoFromM3U(m3uData.items.StreamItem[0].properties.uri, dest, options)
    } else {
        try { fs.mkdirSync(dest + "Data/") } catch (e) { }
        if (m3uData.properties["EXT-X-KEY"]) {
            const keyURIMatch = m3uData.properties["EXT-X-KEY"].match(/URI="([^"]+)"/)
            if (!keyURIMatch) throw new RuntimeException("No key URI found")
            const keyURI = keyURIMatch[1];

            await new Promise((resolve, reject) => {
                request(keyURI).on("error", (e) => {
                    reject(new NetworkException(e.message));
                }).on("response", (response) => {
                    if (response.statusCode != 200) {
                        reject(new NetworkException("HTTP error: " + (response.statusCode)))
                    }
                }).pipe(fs.createWriteStream(dest + "Data/" + getFilenameFromURI(keyURI))).on("finish", resolve);
            })
            m3uData.properties["EXT-X-KEY"] = m3uData.properties["EXT-X-KEY"].replace(keyURI, dest + "Data/" + getFilenameFromURI(keyURI));

        } else {
            throw new RuntimeException("No key found. This should never happen")
        }

        await new Promise((resolve, reject) => {
            console.log(options.connections)
            async.forEachOfLimit(m3uData.items.PlaylistItem, options.connections, (value, key, callback) => {
                if (key % 10 == 0) { console.log((key + 1) + "/" + m3uData.items.PlaylistItem.length) }
                const filename = getFilenameFromURI(value.properties.uri);
                const uri = value.properties.uri;
                value.properties.uri = dest + "Data/" + filename;
                downloadFile(uri, dest + "Data/" + filename).then(callback, callback)

            }, err => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve();
            });
        })

        fs.writeFileSync(dest + ".m3u8", m3uData.toString())


    }
}

module.exports = downloadVideoFromM3U;