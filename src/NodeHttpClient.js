const request = require('request');
let jar = request.jar()

function setCookieJar(cjar) {
    jar = cjar;
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
        //headers: req.headers
    };
}
class NodeHttpClient {
    async get(url, options) {
        return await this.method('GET', url, undefined, options);
    }

    async post(url, body, options) {
        return await this.method('POST', url, body, options);
    }

    method(method, url, body, options) {
        //console.log(url)
        return new Promise((resolve, reject) => {
            request({
                'method': method,
                'uri': url,
                'body': processBody(body),
                'jar': jar,
                "headers": {
                    "Content-Type" : "application/x-www-form-urlencoded",
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:59.0) Gecko/20100101 Firefox/59.0",
                    "Accept-Language": "*"
                }
            }, (err, response) => {
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


module.exports = { NodeHttpClient, setCookieJar }