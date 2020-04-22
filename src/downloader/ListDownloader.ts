import {
    UserInputError,
    RuntimeError,
    NetworkError
} from "../Errors";
import * as request from "request";
import * as async from "async";
import * as fs from "fs";
import { EventEmitter } from "events";
import { DownloadItem } from "../types/download";
import { RequesterCdn } from "../types/Requester";
import * as util from "util";
import * as stream from "stream";
import { Response } from "got/dist/source";
const pipeline = util.promisify(stream.pipeline);


export interface DownloadUpdateOptions {
    filesInProgress: number;
    finishedFiles: number;
    downloadedSize: number;
    estimatedSize: number;
    speed: number;

}
export interface ListDownloader {
    on(name: 'update', listener: (options: DownloadUpdateOptions) => void): this
}

export class ListDownloader extends EventEmitter {
    _list: (DownloadItem & { downloadedSize?: number, totalSize?: number })[];
    _attempts: number;
    _connections: number;
    _abort: boolean;
    _requester: RequesterCdn;

    _filesInProgress: number;

    _finishedFiles: number;
    _downloadedSize: number;
    _estimatedSize: number;

    _speed: number;
    _lastSpeedCheck: number;
    _downloadedSinceCheck: number;

    _lastUpdateEmit: number;

    constructor(list: DownloadItem[], attempts: number, connections: number, requester: RequesterCdn) {
        super();
        this._list = list;
        this._attempts = attempts;
        this._connections = connections;
        this._requester = requester;
        this._abort = false;

        this._filesInProgress = 0;

        this._finishedFiles = 0;
        this._downloadedSize = 0;
        this._estimatedSize = 1;

        this._speed = 0;
        this._lastSpeedCheck = Date.now();
        this._lastUpdateEmit = Date.now();
        this._downloadedSinceCheck = 0;
    }
    _recalculateDownloaded() {
        this._downloadedSize = 0;
        for (const item of this._list) {
            if (item.downloadedSize) {
                this._downloadedSize += item.downloadedSize;
            }
        }
    }
    _estimateSize() {
        this._estimatedSize = 0;
        let numberKnownSize = 0;
        for (const item of this._list) {
            if (item.totalSize) {
                this._estimatedSize += item.totalSize;
                // console.log(item.totalSize);
                numberKnownSize++;
            }
        }
        if (numberKnownSize > 0) {
            let averageSize = this._estimatedSize / numberKnownSize;
            this._estimatedSize += averageSize * (this._list.length - numberKnownSize);
        } else {
            this._estimatedSize = 1;
        }


    }
    _emitUpdate() {
        if (this._abort) return;
        this.emit("update", {
            filesInProgress: this._filesInProgress,
            finishedFiles: this._finishedFiles,
            downloadedSize: this._downloadedSize,
            estimatedSize: this._estimatedSize,
            speed: this._speed,
        })
    }
    _emitUpdateLimit() {
        if (this._abort) return;
        const timeDiff = Date.now() - this._lastUpdateEmit;
        if (timeDiff < 100) return; // update every 0.1 seconds
        this._lastUpdateEmit -= 100;
        this.emit("update", {
            filesInProgress: this._filesInProgress,
            finishedFiles: this._finishedFiles,
            downloadedSize: this._downloadedSize,
            estimatedSize: this._estimatedSize,
            speed: this._speed,
        })
    }
    _updateSpeed(amount) {
        this._downloadedSinceCheck += amount;
        let timeDiff = Date.now() - this._lastSpeedCheck;
        if (timeDiff >= 1000) {
            this._speed = this._downloadedSinceCheck / (timeDiff / 1000);
            this._downloadedSinceCheck = 0;
            this._lastSpeedCheck = Date.now();
        }

    }
    async _downloadFile(index: number) {
        this._filesInProgress++;

        const file = this._list[index];
        for (let attempt = 0; attempt < this._attempts; attempt++) {
            try {
                file.downloadedSize = 0;
                let status: number = -1;
                let contentEncoding: string | undefined = "unset";
                const stream = this._requester.stream(file.url);
                stream.on("response", (response: Response) => {
                    status = response.statusCode;
                    file.totalSize = parseInt(response.headers['content-length'] ?? "-2");
                    contentEncoding = response.headers['content-encoding'];
                    this._estimateSize();
                    this._emitUpdate();
                })
                stream.on("data", (chunk) => {
                    file.downloadedSize += chunk.length;
                    this._downloadedSize += chunk.length;
                    this._updateSpeed(chunk.length)
                    this._emitUpdateLimit();
                });
                await pipeline(
                    stream,
                    fs.createWriteStream(file.destination)
                )

                if (status !== 200) {
                    throw new NetworkError("Status code: " + status);
                }

                // check if file size it equal to transmitted size
                let s = (await fs.promises.stat(file.destination)).size
                if (s !== file.downloadedSize) {
                    console.log(s + " !== " + file.downloadedSize);
                    throw new NetworkError("Transmission incomplete. (Downloaded Size).");
                }
                // as long as the data is uncompressed content_length must be equal the file size
                if ((contentEncoding == "identity" || contentEncoding == undefined) && s !== file.totalSize) {
                    console.log(s + " !== " + file.totalSize);
                    throw new NetworkError("Transmission incomplete. (content_length).");
                }

                return;
            } catch (e) {
                console.log("Error on " + file.url + ".");
                file.downloadedSize = 0;
                this._recalculateDownloaded();
                this._emitUpdate();
                if (attempt >= this._attempts - 1) {
                    throw e;
                }
                console.log("Error: " + e.message + ". Retrying...");
            }
            /*try {
                await new Promise((resolve, reject) => {
                    file.downloadedSize = 0;
                    request(file.url, {
                        forever: true,
                        timeout: 20000,
                        proxy: this.options.httpProxyCdn
                    }).on("error", (e) => {
                        reject(new NetworkError(e.message));
                    }).on("response", (response) => {
                        if (response.statusCode != 200) {
                            reject(new NetworkError("HTTP status code: " + (response.statusCode)));
                            return;
                        }
                        file.totalSize = Number.parseInt(response.headers['content-length'] ?? "1");
                        this.estimateSize();
                        this.emitUpdate();
                        response.on("data", (chunk) => {
                            file.downloadedSize += chunk.length;
                            this.downloadedSize += chunk.length;
                            this.updateSpeed(chunk.length)
                            this.emitUpdate();
                        });
                        response.pipe(fs.createWriteStream(file.destination)).on("finish", (resolve));
                    })
                });
                this.filesInProgress--;
                return;
            } catch (e) {
                file.downloadedSize = 0;
                this.recalculateDownloaded();
                this.emitUpdate();
                if (!(e instanceof NetworkError) || attempt >= this.options.maxAttempts - 1 || this.abort) {
                    this.filesInProgress--;
                    throw e;
                }
                console.log("Network error: " + e.message + ". Retrying...");
            }*/
        }
        throw new RuntimeError("Too many attempts. (This code should't be reachable)");
    }
    startDownload() {
        this._lastSpeedCheck = Date.now();
        this._lastUpdateEmit = Date.now();
        this._downloadedSinceCheck = 0;
        return new Promise((resolve, reject) => {
            async.forEachOfLimit(this._list, 5, (value, key: number, callback) => {
                this._downloadFile(key).then(() => { callback() }, callback)
            }, err => {
                if (err) {
                    this._abort = true;
                    this.emit("error", err)
                    reject(err);
                    return;
                }
                this.emit("finish")
                resolve();
            });
        });
    }
    static async safeDownload(url: string, destination: string, maxAttempts: number, requester: RequesterCdn): Promise<void> {
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            try {
                let status: number = -1;

                let contentLength: number = -1;
                let contentEncoding: string | undefined = "unset";
                let downloadedSize = 0;

                const stream = requester.stream(url)
                stream.on("response", (response: Response) => {
                    status = response.statusCode;
                    contentLength = parseInt(response.headers['content-length'] ?? "-2");
                    contentEncoding = response.headers['content-encoding'];
                })
                stream.on("data", (chunk) => {
                    downloadedSize += chunk.length;
                });
                await pipeline(
                    stream,
                    fs.createWriteStream(destination)
                )

                if (status !== 200) {
                    throw new NetworkError("Status code: " + status);
                }

                // check if file size it equal to transmitted size
                let s = (await fs.promises.stat(destination)).size
                if (s !== downloadedSize) {
                    console.log(s + " !== " + downloadedSize);
                    throw new NetworkError("Transmission incomplete. (Downloaded Size).");
                }
                // as long as the data is uncompressed content_length must be equal the file size
                if ((contentEncoding == "identity" || contentEncoding == undefined) && s !== contentLength) {
                    console.log(s + " !== " + contentLength);
                    throw new NetworkError("Transmission incomplete. (content_length).");
                }

                return;
            } catch (e) {
                console.log("Error on " + url + ".");
                if (attempt >= maxAttempts - 1) {
                    throw e;
                }
                console.log("Network error: " + e.message + ". Retrying...");
            }
        }
        throw new RuntimeError("Too many attempts. (This code should't be reachable)");
    }
}