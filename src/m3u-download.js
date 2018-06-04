
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
        parser.write(data)
        parser.end();
    })
}

function getFilenameFromURI(uri) {
    return decodeURI(uri.match(/\/([^/?]+)(?:\?.*)?$/)[1])
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
            if (!keyURIMatch) throw new Error("no key URI found")
            const keyURI = keyURIMatch[1];

            await new Promise((resolve, reject) => {
                request(keyURI).on("error", (e) => {
                    console.error(e);
                    reject(e);
                }).on("response", (response) => {
                    if (response.statusCode != 200) {
                        console.error("Http error: " + (response.statusCode));
                        reject()
                    }
                }).pipe(fs.createWriteStream(dest + "Data/" + getFilenameFromURI(keyURI))).on("finish", resolve);
            })
            m3uData.properties["EXT-X-KEY"] = m3uData.properties["EXT-X-KEY"].replace(keyURI, dest + "Data/" + getFilenameFromURI(keyURI));

        } else {
            console.log("No key found, this should never happen")
        }

        await new Promise((resolve, reject) => {
            console.log(options.connections)
            async.forEachOfLimit(m3uData.items.PlaylistItem, options.connections, (value, key, callback) => {
                if (key % 10 == 0) { console.log((key + 1) + "/" + m3uData.items.PlaylistItem.length) }
                const filename = getFilenameFromURI(value.properties.uri);
                const uri = value.properties.uri;
                value.properties.uri = dest + "Data/" + filename;
                request(uri, {forever:true}).on("error", (e) => {
                    console.error(e);
                    process.exit(1);
                }).on("response", (response) => {
                    if (response.statusCode != 200) {
                        console.error("Http error: " + (response.statusCode));
                        process.exit(1);
                    }
                }).pipe(fs.createWriteStream(dest + "Data/" + filename)).on("finish", callback);
            }, err => {
                if (err) {
                    console.error(err.message);
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