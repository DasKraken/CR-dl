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


export default class ListDownloader extends EventEmitter {
    list: (DownloadItem & { downloadedSize?: number, totalSize?: number })[];
    options: any;
    abort: boolean;

    filesInProgress: number;

    finishedFiles: number;
    downloadedSize: number;
    estimatedSize: number;

    speed: number;
    lastSpeedCheck: number;
    downloadedSinceCheck: number;

    constructor(list: DownloadItem[], options) {
        super();
        this.list = list;
        this.options = options;
        this.abort = false;

        this.filesInProgress = 0;

        this.finishedFiles = 0;
        this.downloadedSize = 0;
        this.estimatedSize = 1;

        this.speed = 0;
        this.lastSpeedCheck = Date.now();
        this.downloadedSinceCheck = 0;
    }
    recalculateDownloaded() {
        this.downloadedSize = 0;
        for (const item of this.list) {
            if (item.downloadedSize) {
                this.downloadedSize += item.downloadedSize;
            }
        }
    }
    estimateSize() {
        this.estimatedSize = 0;
        let numberKnownSize = 0;
        for (const item of this.list) {
            if (item.totalSize) {
                this.estimatedSize += item.totalSize;
                // console.log(item.totalSize);
                numberKnownSize++;
            }
        }
        if (numberKnownSize > 0) {
            let averageSize = this.estimatedSize / numberKnownSize;
            this.estimatedSize += averageSize * (this.list.length - numberKnownSize);
        } else {
            this.estimatedSize = 1;
        }


    }
    emitUpdate() {
        if (this.abort) return;
        this.emit("update", {
            filesInProgress: this.filesInProgress,
            finishedFiles: this.finishedFiles,
            downloadedSize: this.downloadedSize,
            estimatedSize: this.estimatedSize,
            speed: this.speed,
        })
    }
    updateSpeed(amount) {
        this.downloadedSinceCheck += amount;
        let timeDiff = Date.now() - this.lastSpeedCheck;
        if (timeDiff >= 1000) {
            this.speed = this.downloadedSinceCheck / (timeDiff / 1000);
            this.downloadedSinceCheck = 0;
            this.lastSpeedCheck = Date.now();
        }

    }
    async downloadFile(index: number) {
        this.filesInProgress++;

        const file = this.list[index];
        for (let attempt = 0; attempt < this.options.maxAttempts; attempt++) {
            try {
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
                        file.totalSize = Number.parseInt(response.headers['content-length'] || "1");
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
            }
        }
        throw new RuntimeError("Too many attempts. (This code should't be reachable)");
    }
    startDownload() {
        this.lastSpeedCheck = Date.now();
        this.downloadedSinceCheck = 0;
        return new Promise((resolve, reject) => {
            async.forEachOfLimit(this.list, this.options.connections, (value, key: number, callback) => {
                this.downloadFile(key).then(() => { callback() }, callback)
            }, err => {
                if (err) {
                    this.abort = true;
                    this.emit("error", err)
                    reject(err);
                    return;
                }
                this.emit("finish")
                resolve();
            });
        });
    }
}