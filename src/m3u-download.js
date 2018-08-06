const {
    UserInputException,
    RuntimeException,
    NetworkException
} = require("./Exceptions");
const rp = require("request-promise-native");
const request = require("request");
const fs = require("fs");
const _cliProgress = require('cli-progress');
const ListDownloader = require("./ListDownloader");
const prettyBytes = require('pretty-bytes');
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
require('m3u8/m3u/AttributeList').dataTypes["frame-rate"] = "decimal-floating-point";

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

async function downloadFile(uri, dest, options) {
    for (let attempt = 0; attempt < options.maxAttempts; attempt++) {
        try {
            await new Promise((resolve, reject) => {
                request(uri, {
                    forever: true,
                    timeout: 20000
                }).on("error", (e) => {
                    reject(new NetworkException(e.message));
                }).on("response", (response) => {
                    if (response.statusCode != 200) {
                        reject(new NetworkException("HTTP status code: " + (response.statusCode)));
                    }
                }).pipe(fs.createWriteStream(dest)).on("finish", (resolve));
            });
            return;
        } catch (e) {
            if (e instanceof NetworkException) {
                if (attempt >= options.maxAttempts - 1 || options.abort) throw e;
            } else {
                throw e;
            }
            console.log("Network error: " + e.message + ". Retrying...");
        }
    }
    throw new RuntimeException("Too many attempts. (This code should't be reachable)");
}

async function downloadString(uri, options) {
    for (let attempt = 0; attempt < options.maxAttempts; attempt++) {
        try {
            return await new Promise((resolve, reject) => {
                request(uri, {
                    forever: true,
                    timeout: 20000
                }, (error, response, body) => {
                    if (error) {
                        reject(new NetworkException(e.message));
                        return;
                    }
                    if (response.statusCode != 200) {
                        reject(new NetworkException("HTTP status code: " + (response.statusCode)));
                        return;
                    }
                    resolve(body);
                })
            });
        } catch (e) {
            if (e instanceof NetworkException) {
                if (attempt >= options.maxAttempts - 1 || options.abort) throw e;
            } else {
                throw e;
            }
            console.log("Network error: " + e.message + ". Retrying...");
        }
    }
    throw new RuntimeException("Too many attempts. (This code should't be reachable)");
}


async function downloadVideoFromM3U(url, dest, options) {
    options = Object.assign({}, options);
    options.connections = options.connections || 20;
    options.maxAttempts = options.maxAttempts || 5;
    options.abort = false; // when set to true, connections should not be reattempted
    const m3u = await downloadString(url, options)
    const m3uData = await parseM3U(m3u);
    if (m3uData.items.StreamItem.length > 0) { // Stream List
        await downloadVideoFromM3U(m3uData.items.StreamItem[0].properties.uri, dest, options)
    } else {
        try {
            fs.mkdirSync(dest + "Data/")
        } catch (e) {}
        if (m3uData.properties["EXT-X-KEY"]) {
            const keyURIMatch = m3uData.properties["EXT-X-KEY"].match(/URI="([^"]+)"/)
            if (!keyURIMatch) throw new RuntimeException("No key URI found")
            const keyURI = keyURIMatch[1];

            await downloadFile(keyURI, dest + "Data/" + getFilenameFromURI(keyURI), options)
            m3uData.properties["EXT-X-KEY"] = m3uData.properties["EXT-X-KEY"].replace(keyURI, dest + "Data/" + getFilenameFromURI(keyURI));

        } else {
            throw new RuntimeException("No key found. This should never happen")
        }
        const downloadList = [];
        for (const item of m3uData.items.PlaylistItem) {
            const filename = getFilenameFromURI(item.properties.uri);
            const uri = item.properties.uri;
            item.properties.uri = dest + "Data/" + filename;
            downloadList.push({
                url: uri,
                dest: dest + "Data/" + filename
            })
        }
        const listDownloader = new ListDownloader(downloadList, options);
        const downloadPromise = listDownloader.startDownload();
        if (options.showProgressBar) {
            const bar1 = new _cliProgress.Bar({
                format: 'downloading [{bar}] {percentage}% | {downSize}/{estSize} | Speed: {speed}/s | ETA: {myEta}s'
            }, _cliProgress.Presets.shades_classic);
            bar1.start(1, 0);
            listDownloader.on("update", (data) => {

                bar1.setTotal(data.estimatedSize);
                bar1.update(data.downloadedSize, {
                    downSize: prettyBytes(data.downloadedSize),
                    estSize: prettyBytes(data.estimatedSize),
                    speed: prettyBytes(data.speed),
                    myEta: Math.floor((data.estimatedSize - data.downloadedSize) / data.speed)
                });
            })
            listDownloader.on("finish", () => {
                bar1.stop();
            })
            listDownloader.on("error", () => {
                bar1.stop();
            })
        } else {
            let lastPercent = 0;
            listDownloader.on("update", (data) => {
                const curPercent = Math.floor(data.downloadedSize / data.estimatedSize * 100);
                if (curPercent > lastPercent) {
                    const downSize = prettyBytes(data.downloadedSize)
                    const estSize = prettyBytes(data.estimatedSize)
                    const speed = prettyBytes(data.speed)
                    const myEta = Math.floor((data.estimatedSize - data.downloadedSize) / data.speed)
                    console.log(`downloading ${curPercent}% | ${downSize}/${estSize} | Speed: ${speed}/s | ETA: ${myEta}s`)
                    lastPercent = curPercent;
                }
            })
        }

        await downloadPromise;
        fs.writeFileSync(dest + ".m3u8", m3uData.toString())

    }
}

module.exports = downloadVideoFromM3U;