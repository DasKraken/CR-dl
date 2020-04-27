import { RequesterCdn } from "../types/Requester";
import { DownloadItem } from "../types/download";
import * as path from "path";
import { RuntimeError } from "../Errors";
import { parseM3U } from "../Utils";
import { M3U } from "../types/m3u";


function getFilenameFromURI(uri): string {
    return decodeURI(uri.match(/\/([^/?]+)(?:\?.*)?$/)[1]);
}


export class M3uDownloader {
    _videoFiles?: DownloadItem[];
    _keyFile?: DownloadItem;
    _m3u?: M3U;

    _requester: RequesterCdn
    // {destination}/file.m3u8 - {destination}/{subFolder}/video.ts
    async load(url: string, destination: string, subFolder: string, requester: RequesterCdn): Promise<void> {
        this._requester = requester;
        const m3u = (await this._requester.get(url)).body.toString();
        this._m3u = await parseM3U(m3u);
        if (this._m3u.items.StreamItem.length > 0) { // Stream List
            return await this.load(this._m3u.items.StreamItem[0].properties.uri ?? "", destination, subFolder, requester);
        } else {
            const dataDir: string = path.join(destination, subFolder);
            this._videoFiles = [];
            this._keyFile = undefined;

            if (this._m3u.properties["EXT-X-KEY"]) {
                const keyURIMatch = this._m3u.properties["EXT-X-KEY"].match(/URI="([^"]+)"/);
                if (!keyURIMatch) throw new RuntimeError("No key URI found");
                const keyURI = keyURIMatch[1];

                const keyFile = path.join(dataDir, getFilenameFromURI(keyURI));
                const keyFileRelative = path.join(subFolder, getFilenameFromURI(keyURI)).replace(/\\/g, "/");

                this._keyFile = {
                    url: keyURI,
                    destination: keyFile
                };
                this._m3u.properties["EXT-X-KEY"] = this._m3u.properties["EXT-X-KEY"].replace(keyURI, keyFileRelative);

            } else {
                throw new RuntimeError("No key found. This should never happen");
            }
            for (const item of this._m3u.items.PlaylistItem) {
                const filename: string = getFilenameFromURI(item.properties.uri);
                const uri: string = item.properties.uri ?? "";
                item.properties.uri = path.join(subFolder, filename).replace(/\\/g, "/");
                this._videoFiles.push({
                    url: uri,
                    destination: path.join(dataDir, filename)
                });
            }
        }
    }
    getVideoFiles(): DownloadItem[] {
        if (!this._videoFiles) throw new RuntimeError("Tried to get video files before loading");
        return this._videoFiles;
    }
    getKeyFile(): DownloadItem | undefined {
        return this._keyFile;
    }
    getModifiedM3u(): string {
        if (!this._m3u) throw new RuntimeError("Tried to get m3u before loading");
        return this._m3u.toString();
    }
}