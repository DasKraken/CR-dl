import got from "../requester/got";
import cloudscraper from "../requester/cloudscraper";
import * as request from "request";
import * as fs from "fs";
import { Requester, RequesterCdn } from "../types/Requester";

const cookies = request.jar();

export function loadCookies(): void {
    if (fs.existsSync("cookies.data")) {
        const fileData = fs.readFileSync("cookies.data").toString();
        // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
        // @ts-ignore
        cookies._jar._importCookiesSync(JSON.parse(fileData));

    }
}

export function saveCookies(): void {
    // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
    // @ts-ignore
    fs.writeFileSync("cookies.data", JSON.stringify(cookies._jar.serializeSync()));
}

export function getRequester(options: { proxy?: string }): Requester {
    return cloudscraper(cookies, options.proxy);
}

export function getRequesterCdn(options: { proxyCdn?: string }): RequesterCdn {
    return got(options.proxyCdn);
}
