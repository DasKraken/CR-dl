import got, { AgentByProtocol } from "got";
import { Readable } from "stream";
import { RequesterCdn } from "../types/Requester";
import * as tunnel from "tunnel";
import * as util from "util";
import * as https from "https";
import { UserInputError } from "../Errors";
import { URL } from "url";

function getProxyAuth(proxyURL: URL): string | undefined {
    if (proxyURL.username.length > 0) {
        return decodeURIComponent(proxyURL.username) + ":" + decodeURIComponent(proxyURL.password);
    } else {
        return undefined;
    }
}

export default function (proxy?: string, retry?: number): RequesterCdn {
    const proxyURL = proxy ? new URL(proxy) : undefined;
    let agent: AgentByProtocol | undefined;
    if (proxyURL) {
        if (proxyURL.protocol == "http:") {
            agent = {
                http: tunnel.httpOverHttp({
                    proxy: {
                        host: proxyURL.hostname,
                        port: parseInt(proxyURL.port) || 80,
                        proxyAuth: getProxyAuth(proxyURL)

                    }
                }),
                https: tunnel.httpsOverHttp({
                    proxy: {
                        host: proxyURL.hostname,
                        port: parseInt(proxyURL.port) || 80,
                        proxyAuth: getProxyAuth(proxyURL)

                    }
                }) as https.Agent
            };
        } else if (proxyURL.protocol == "https:") {
            agent = {
                http: tunnel.httpOverHttps({
                    proxy: {
                        host: proxyURL.hostname,
                        port: parseInt(proxyURL.port) || 443,
                        proxyAuth: getProxyAuth(proxyURL)
                    }
                }),
                https: tunnel.httpsOverHttps({
                    proxy: {
                        host: proxyURL.hostname,
                        port: parseInt(proxyURL.port) || 443,
                        proxyAuth: getProxyAuth(proxyURL)
                    }
                }) as https.Agent
            };
        } else {
            throw new UserInputError("Unsupported proxy protocol: " + util.inspect(proxyURL.protocol));
        }
    }
    return {
        stream: (url: string): Readable => {
            return got.stream(url, { agent, retry, timeout: 15000 });
        },
        get: (url: string): Promise<{ body: Buffer; url: string }> => {
            return got.get(url, { responseType: "buffer", agent, retry, timeout: 15000 });
        }
    };

}
