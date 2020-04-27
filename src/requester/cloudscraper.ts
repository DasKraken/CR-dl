import * as cloudscraper from "cloudscraper";
import * as request from "request";
import { Requester } from "../types/Requester";

export default function (jar: request.CookieJar, proxy?: string): Requester {
    return {
        get: (url: string): Promise<{ body: Buffer; url: string }> => {
            return new Promise((resolve, reject) => {
                // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
                // @ts-ignore
                cloudscraper({ method: "GET", url: url, jar: jar, encoding: null, resolveWithFullResponse: true, proxy: proxy }).then((r: request.Response) => {
                    resolve({ body: r.body, url: r.request.uri.href as string });
                }).catch(reject);

            });
        },
        post: (url: string, formData?: Record<string, string>): Promise<{ body: Buffer }> => {
            return new Promise((resolve, reject) => {
                // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
                // @ts-ignore
                cloudscraper({ method: "POST", url: url, jar: jar, encoding: null, resolveWithFullResponse: true, proxy: proxy, formData: formData }).then((r: request.Response) => {
                    resolve({ body: r.body });
                }).catch(reject);

            });
        }
    };

}