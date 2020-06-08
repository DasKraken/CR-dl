import cloudscraper from "cloudscraper";
import request from "request";
import { Requester } from "../types/Requester";


const agentOptions = {
    ciphers: [
        "TLS_AES_128_GCM_SHA256",
        "TLS_AES_256_GCM_SHA384",
        "TLS_CHACHA20_POLY1305_SHA256",
        "ECDHE-ECDSA-AES128-GCM-SHA256",
        "ECDHE-RSA-AES128-GCM-SHA256",
        "ECDHE-ECDSA-AES256-GCM-SHA384",
        "ECDHE-RSA-AES256-GCM-SHA384",
        "ECDHE-ECDSA-CHACHA20-POLY1305",
        "ECDHE-RSA-CHACHA20-POLY1305",
        "ECDHE-RSA-AES128-SHA",
        "ECDHE-RSA-AES256-SHA",
        "AES128-GCM-SHA256",
        "AES256-GCM-SHA384",
        "AES128-SHA",
        "AES256-SHA",
        "DES-CBC3-SHA"
    ].join(":"),
    ecdhCurve: "prime256v1"
};

export default function (jar: request.CookieJar, proxy?: string): Requester {
    return {
        get: (url: string): Promise<{ body: Buffer; url: string }> => {
            return new Promise((resolve, reject) => {
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                cloudscraper({ method: "GET", url: url, jar: jar, encoding: null, resolveWithFullResponse: true, proxy: proxy, agentOptions: agentOptions }).then((r: request.Response) => {
                    resolve({ body: r.body, url: r.request.uri.href as string });
                }).catch(reject);

            });
        },
        post: (url: string, formData?: Record<string, string>): Promise<{ body: Buffer }> => {
            return new Promise((resolve, reject) => {
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                cloudscraper({ method: "POST", url: url, jar: jar, encoding: null, resolveWithFullResponse: true, proxy: proxy, formData: formData, agentOptions: agentOptions }).then((r: request.Response) => {
                    resolve({ body: r.body });
                }).catch(reject);

            });
        }
    };

}
