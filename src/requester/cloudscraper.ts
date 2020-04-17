import * as cloudscraper from "cloudscraper";
import * as request from "request";

export default function (jar: request.CookieJar) {
    return {
        get: (url: string): Promise<{ body: Buffer, url: string }> => {
            // @ts-ignore
            return new Promise((resolve, reject) => {
                // @ts-ignore
                cloudscraper({ method: "GET", url: url, jar: jar, encoding: null, resolveWithFullResponse: true }).then((r: request.Response) => {
                    resolve({ body: r.body, url: r.request.uri.href as string });
                }).catch(reject);

            });
        },
        post: (url: string, formData?: Record<string, string>): Promise<{ body: Buffer }> => {
            // @ts-ignore
            return new Promise((resolve, reject) => {
                // @ts-ignore
                cloudscraper({ method: "POST", url: url, jar: jar, encoding: null, resolveWithFullResponse: true, formData: formData }).then((r: request.Response) => {
                    resolve({ body: r.body });
                }).catch(reject);

            });
        }
    }

}