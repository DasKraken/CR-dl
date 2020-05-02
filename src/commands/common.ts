import got from "../requester/got";
import cloudscraper from "../requester/cloudscraper";
import * as request from "request";
import * as fs from "fs";
import { Requester, RequesterCdn } from "../types/Requester";

const cookies = request.jar();


interface ToughCookie {
    key: string;
    value: string;
    domain: string;
    path: string;
    secure: boolean;
    expires?: string;
    httpOnly: boolean;
    hostOnly: boolean;
    lastAccess: string;
    creation: string;
}

export function loadCookies(options: { cookies: string }): void {

    if (fs.existsSync(options.cookies)) {
        const fileData = fs.readFileSync(options.cookies, { encoding: "utf8" }).toString();
        try {
            // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
            // @ts-ignore
            cookies._jar._importCookiesSync(JSON.parse(fileData));
            return;
        } catch (e) {
            // empty
        }
        if (/^#(?: Netscape)? HTTP Cookie File/.test(fileData)) {
            const now = (new Date()).toISOString();
            const cookieList: ToughCookie[] = fileData
                .split("\n")
                .map(line => line.split("\t").map(s => s.trim()))
                .filter(line => line.length === 7)
                .filter(cookie => cookie[0].endsWith("crunchyroll.com"))
                .map(cookie => ({
                    key: decodeURIComponent(cookie[5]),
                    value: decodeURIComponent(cookie[6]),
                    domain: cookie[0],
                    path: cookie[2],
                    secure: cookie[3] === "TRUE",
                    expires: (new Date(parseInt(cookie[4]) * 1000)).toISOString(),
                    httpOnly: false,
                    hostOnly: true,
                    lastAccess: now,
                    creation: now
                }))
                .map(cookie => {
                    if (cookie.domain.substr(0, 10) === "#HttpOnly_") {
                        cookie.httpOnly = true;
                        cookie.domain = cookie.domain.substr(10);
                    }
                    return cookie;
                })
                .map(cookie => {
                    if (cookie.domain.startsWith(".")) {
                        cookie.domain = cookie.domain.substr(1);
                        cookie.hostOnly = false;
                    }
                    return cookie;
                });
            const out = {
                "version": "tough-cookie@2.3.4",
                "storeType": "MemoryCookieStore",
                "rejectPublicSuffixes": true,
                "cookies": cookieList
            };
            // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
            // @ts-ignore
            cookies._jar._importCookiesSync(out);
            return;
        }
    }


}

export function saveCookies(options: { cookies: string }): void {
    // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
    // @ts-ignore
    const cookieList: ToughCookie[] = cookies._jar.serializeSync().cookies;
    //fs.writeFileSync("cookies.data", JSON.stringify(cookies._jar.serializeSync()));


    let data = `# Netscape HTTP Cookie File
# https://curl.haxx.se/rfc/cookie_spec.html
# This is a generated file! Do not edit.

`;
    const formatDate = (date: string): number => Math.round((new Date(date)).getTime() / 1000);

    for (const cookie of cookieList) {
        if (!cookie.hostOnly) {
            cookie.domain = "." + cookie.domain;
        }
        data += [
            cookie.httpOnly ? "#HttpOnly_" + cookie.domain : cookie.domain,
            cookie.hostOnly ? "FALSE" : "TRUE",
            cookie.path,
            cookie.secure ? "TRUE" : "FALSE",
            cookie.expires && cookie.expires != "Infinity" ? formatDate(cookie.expires) : "0",
            encodeURIComponent(cookie.key),
            encodeURIComponent(cookie.value || "")
        ].join("\t") + "\n";
    }


    fs.writeFileSync(options.cookies, data);

}

export function getRequester(options: { proxy?: string }): Requester {
    return cloudscraper(cookies, options.proxy);
}

export function getRequesterCdn(options: { proxyCdn?: string }): RequesterCdn {
    return got(options.proxyCdn);
}
