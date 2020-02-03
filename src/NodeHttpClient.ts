import * as request from 'request';
let jar = request.jar()

export function setCookieJar(cjar) {
    jar = cjar;
}

let httpProxy;
export function setHttpProxy(proxy) {
    httpProxy = proxy;
}

function processBody(body) {
    if (!body) return undefined;

    if (typeof body === "object") {
        let tokens = [];
        for (let key in body) {
            if (body.hasOwnProperty(key)) {
                tokens.push(encodeURIComponent(key) + "=" + encodeURIComponent(body[key] + ''));
            }
        }

        return tokens.join("&");
    } else {
        return body;
    }
}

function getResponse(req) {
    return {
        body: req.body.toString(),
        status: req.statusCode || 0,
        statusText: req.statusMessage || "",
        url: req.request.uri.href,
        //headers: req.headers
    };
}
export class NodeHttpClient {
    async get(url, options) {
        return await this.method('GET', url, undefined, options);
    }

    async post(url, body, options) {
        return await this.method('POST', url, body, options);
    }

    method(method, url, body, options) {
        //console.log(url)
        return new Promise((resolve, reject) => {
            options = options || {};
            options["method"] = method;
            options["uri"] = url;
            options["body"] = processBody(body);
            options["jar"] = jar;
            options["headers"] = options["headers"] || {};
            options.headers["User-Agent"] = options.headers["User-Agent"] || "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:61.0) Gecko/20100101 Firefox/61.0";
            options.headers["Accept-Language"] = options.headers["Accept-Language"] || "*";
            options.proxy = httpProxy;
            if (body) options.headers["Content-Type"] = "application/x-www-form-urlencoded";
            request(options, (err, response) => {
                if (err) {
                    reject(err);
                } else {
                    const res = getResponse(response);
                    const statusCode = response.statusCode || 0;
                    if (statusCode >= 200 && statusCode < 300) {
                        resolve(res);
                    } else {
                        reject(res);
                    }
                }
            });
        });
    }
}
