const { CloudflareException } = require("./Exceptions");

function timeout(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
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
class CloudflareBypass {
    constructor(httpClient) {
        this.httpClient = httpClient;
    }
    async get(url, options) {
        try {
            return await this.httpClient.get(url, options)
        } catch (response) {

            if (this.hasCfChallange(response.body)) {
                console.log("Cloudflare challenge detected. Trying to solve...")
                const urlo = new URL(url)
                let submitUrl = `${urlo.protocol}//${urlo.host}/cdn-cgi/l/chk_jschl`
                const formData = {};
                try {
                    formData["jschl_vc"] = response.body.match(/name="jschl_vc" value="([0-9a-f]+)"/)[1]
                    formData["pass"] = response.body.match(/name="pass" value="([^"]+)"/)[1]
                } catch (e) {
                    throw new CloudflareException("Unable to find CF formdata")
                }
                formData["jschl_answer"] = this.solveCfChallange(response.body, url)

                submitUrl = submitUrl + "?" + processBody(formData);
                await timeout(4000);
                return await this.get(submitUrl, {
                    headers: {
                        "Referer": url,
                        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:61.0) Gecko/20100101 Firefox/61.0",
                        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                        //"Accept-Encoding": "gzip, deflate, br",
                        "DNT": 1,
                        "Upgrade-Insecure-Requests": 1,
                        "Pragma": "no-cache",
                        "Cache-Control": "no-cache"
                    }
                });

            } else if (this.hasCfCaptcha(response.body)) {
                throw new CloudflareException("Got Cloudflare captcha. Can't continue.")
            } else {
                throw response;
            }
        }
    }
    async post(url, body, options) {
        return await this.httpClient.post(url, body, options);
    }

    hasCfCaptcha(html) {
        return html && html.indexOf("cf-captcha-container") > -1;
    }
    hasCfChallange(html) {
        return html && html.indexOf("/cdn-cgi/l/chk_jschl") > -1;
    }
    solveCfChallange(html, url) {
        let js;
        try {
            js = /setTimeout\(function\(\){\s+(var s,t,o,p,b,r,e,a,k,i,n,g,f.+?\r?\n[\s\S]+?a\.value =.+?)\r?\n/.exec(html)[1];
        } catch (e) {
            throw new CloudflareException("Unable to identify Cloudflare IUAM Javascript on website.")
        }

        js = js.replace(/a\.value = (.+ \+ t\.length).+/, "$1")

        const urlo = new URL(url)

        js = js.replace(/\s{3,}[a-z](?: = |\.).+/g, "").replace("t.length", "" + (urlo.hostname.length))

        if (js.indexOf("toFixed") == -1)
            throw new CloudflareException("Error parsing Cloudflare IUAM Javascript challenge.")


        // Use vm.runInNewContext to safely evaluate code
        // The sandboxed code cannot use the Node.js standard library
        let result;
        try {
            result = require('vm').runInNewContext(js, Object.create(null), { timeout: 5000 });
        } catch (e) {
            throw new CloudflareException("Error thrown while executing challenge: " + e.message);
        }
        if (isNaN(result)) {
            throw new CloudflareException("Cloudflare IUAM challenge returned unexpected answer.");
        }
        return result;
    }
}
module.exports = CloudflareBypass