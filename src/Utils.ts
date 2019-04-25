import * as fs from "fs";
const removeDiacritics = require('diacritics').remove;

export function pad(num, size) {
    var s = num + "";
    while (s.length < size) s = "0" + s;
    return s;
}

export function deleteFolderRecursive(path) {
    if (fs.existsSync(path)) {
        fs.readdirSync(path).forEach(function (file, index) {
            var curPath = path + "/" + file;
            if (fs.lstatSync(curPath).isDirectory()) { // recurse
                deleteFolderRecursive(curPath);
            } else { // delete file
                fs.unlinkSync(curPath);
            }
        });
        fs.rmdirSync(path);
    }
};

export function toFilename(str) {
    return str.replace(/[\\/:*?"<>|]+/g, "_")
}

export function formatScene(s) {
    s = removeDiacritics(s);
    s = s.replace(/[^A-Za-z0-9\._-]/g, ".");
    s = s.replace(/\.{2,}/g, ".");
    s = s.replace(/-{2,}/g, "-");
    s = s.replace(/_{2,}/g, "_");
    s = s.replace(/[._-]{2,}/g, ".");
    s = s.replace(/^[._-]/, "");
    s = s.replace(/[._-]$/, "");
    return s;
}