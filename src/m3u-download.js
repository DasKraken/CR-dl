const {
    RuntimeException,
    NetworkException
} = require("./Exceptions");
const request = require("request");
const fs = require("fs");
const _cliProgress = require('cli-progress');
const ListDownloader = require("./ListDownloader");
const prettyBytes = require('pretty-bytes');
const mkdirp = require("mkdirp");
const path = require("path")

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
        return await downloadVideoFromM3U(m3uData.items.StreamItem[0].properties.uri, dest, options)
    } else {
        const dirRelative = dest + "Data";
        const dir = path.join(options.tmpDir, dirRelative);

        mkdirp.sync(dir);
        if (m3uData.properties["EXT-X-KEY"]) {
            const keyURIMatch = m3uData.properties["EXT-X-KEY"].match(/URI="([^"]+)"/)
            if (!keyURIMatch) throw new RuntimeException("No key URI found")
            const keyURI = keyURIMatch[1];

            const keyFile = path.join(dir, getFilenameFromURI(keyURI));
            const keyFileRelative = path.join(dirRelative, getFilenameFromURI(keyURI)).replace(/\\/g, "/");

            await downloadFile(keyURI, keyFile, options);
            m3uData.properties["EXT-X-KEY"] = m3uData.properties["EXT-X-KEY"].replace(keyURI, keyFileRelative);

        } else {
            throw new RuntimeException("No key found. This should never happen")
        }
        const downloadList = [];
        for (const item of m3uData.items.PlaylistItem) {
            const filename = getFilenameFromURI(item.properties.uri);
            const uri = item.properties.uri;
            item.properties.uri = path.join(dirRelative, filename).replace(/\\/g, "/");
            downloadList.push({
                url: uri,
                dest: path.join(dir, filename)
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
        const m3u8File = path.join(options.tmpDir, dest + ".m3u8");
        fs.writeFileSync(m3u8File, m3uData.toString());
        return m3u8File;
    }
}

module.exports = downloadVideoFromM3U;