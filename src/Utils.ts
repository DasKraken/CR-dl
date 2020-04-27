import * as fs from "fs";
import { M3U } from "./types/m3u";
const removeDiacritics = require("diacritics").remove;
import * as m3u8 from "m3u8";


export function pad(num: string | number, size: number): string {
    let s = num.toString();
    while (s.length < size) s = "0" + s;
    return s;
}

export function deleteFolderRecursive(path: fs.PathLike): void {
    if (fs.existsSync(path)) {
        fs.readdirSync(path).forEach(function (file) {
            const curPath = path + "/" + file;
            if (fs.lstatSync(curPath).isDirectory()) { // recurse
                deleteFolderRecursive(curPath);
            } else { // delete file
                fs.unlinkSync(curPath);
            }
        });
        fs.rmdirSync(path);
    }
}

export function toFilename(str: string): string {
    return str.replace(/[\\/:*?"<>|]+/g, "_");
}

export function formatScene(s: string): string {
    s = removeDiacritics(s);
    s = s.replace(/[^A-Za-z0-9._-]/g, ".");
    s = s.replace(/\.{2,}/g, ".");
    s = s.replace(/-{2,}/g, "-");
    s = s.replace(/_{2,}/g, "_");
    s = s.replace(/[._-]{2,}/g, ".");
    s = s.replace(/^[._-]/, "");
    s = s.replace(/[._-]$/, "");
    return s;
}

export function makeid(length: number): string {
    let result = "";
    const characters = "abcdefghijklmnopqrstuvwxyz0123456789";
    const charactersLength = characters.length;
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}





export function parseM3U(data: string): Promise<M3U> {
    return new Promise((resolve, reject) => {
        const parser = m3u8.createStream();
        parser.on("m3u", function (m3u: M3U) {
            resolve(m3u);
            // fully parsed m3u file
        });
        parser.on("error", function (err: Error) {
            reject(err);
        });
        parser.write(data);
        parser.end();
    });
}