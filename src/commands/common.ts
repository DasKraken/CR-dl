import got from "../requester/got";
import cloudscraper from "../requester/cloudscraper";
import * as request from "request";
import * as fs from "fs";

let cookies = request.jar();

export function loadCookies() {
    if (fs.existsSync("cookies.data")) {
        const fileData = fs.readFileSync("cookies.data").toString();
        // @ts-ignore
        cookies._jar._importCookiesSync(JSON.parse(fileData));

    }
}

export function saveCookies() {
    // @ts-ignore
    fs.writeFileSync("cookies.data", JSON.stringify(cookies._jar.serializeSync()));
}

export function getRequester(options: { proxy?: string }) {
    return cloudscraper(cookies, options.proxy);
}

export function getRequesterCdn(options: { proxyCdn?: string }) {
    return got(options.proxyCdn);
}