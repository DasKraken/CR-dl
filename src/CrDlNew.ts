import { Readable } from "stream";
import cloudscraper from "./requester/cloudscraper";
import * as request from "request";
import got from "./requester/got";
import { NetworkException, RuntimeException, UserInputException } from "./Exceptions";

export interface Requester {
    get: (url: string) => Promise<{ body: Buffer, url: string }>;
    post: (url: string, formdata?: Record<string, string>) => Promise<{}>
}

export interface RequesterCdn {
    stream: (url: string) => Readable
}

export interface Options {
    requester?: Requester;
    requesterCdn?: RequesterCdn;
}

export interface Episode {
    url: string;
    name: string;
    number: string; // Episode number can also be non numerical
}
export interface Season {
    name: string;
    episodes: Episode[];
}


export class CrDl {
    _requester: Requester;
    _requesterCdn: RequesterCdn;
    constructor(options?: Options) {
        if (options && options.requester) {
            this._requester = options.requester;
        } else {
            this._requester = cloudscraper(request.jar());
        }

        if (options && options.requesterCdn) {
            this._requesterCdn = options.requesterCdn;
        } else {
            this._requesterCdn = got();
        }
    }

    async isLoggedIn(): Promise<boolean> {
        let res = await this._requester.get("http://www.crunchyroll.com/videos/anime");
        return res.body.indexOf("<a href=\"/logout\"") > -1
    }

    async login(username: string, password: string): Promise<void> {
        if (await this.isLoggedIn()) {
            console.log("Already logged in!");
            return;
        }
        let loginPage: { body: Buffer, url: string };
        try {
            loginPage = await this._requester.get("https://www.crunchyroll.com/login");
        } catch (e) {
            throw e;
        }
        const loginTokenMatch = /name="login_form\[_token\]" value="([^"]+)" \/>/.exec(loginPage.body.toString())
        if (!loginTokenMatch) {
            throw new RuntimeException("Error logging in: No login token found.");
        }
        const token = loginTokenMatch[1];
        let res;
        try {
            res = (await this._requester.post(loginPage.url, {
                "login_form[_token]": token,
                "login_form[name]": username,
                "login_form[password]": password,
                "login_form[redirect_url]": "/"
            })).toString();
        } catch (e) {
            console.log(e);

        }
        if (await this.isLoggedIn()) {
            return;
        } else {
            throw new UserInputException("Couldn't log in. Wrong credentials?");
        }

    }
    async logout(): Promise<void> {
        await this._requester.get("http://www.crunchyroll.com/logout");
    }

    async getLang(): Promise<string> {
        let res = await this._requester.get("http://www.crunchyroll.com/videos/anime");
        let m = res.body.toString().match(/<a href="[^"]+"\s*onclick="return Localization\.SetLang\(\s*'([A-Za-z]{4})',\s*'[^']+',\s*'[^']+'\s*\);"\s*data-language="[^"]+"\s*class="selected">[^<]+<\/a>/);
        if (m) {
            return m[1];
        } else {
            throw new RuntimeException("Couldn't find Language");
        }
    }
    async setLang(lang: string): Promise<void> {
        let res = await this._requester.get("http://www.crunchyroll.com/videos/anime");
        let tokenMatch = res.body.toString().match(/<a href="[^"]+"\s*onclick="return Localization\.SetLang\(\s*'[A-Za-z]{4}',\s*'([^']+)',\s*'[^']+'\s*\);"\s*data-language="[^"]+"\s*class="selected">[^<]+<\/a>/);
        let token;
        if (tokenMatch) {
            token = tokenMatch[1];
        } else {
            throw new RuntimeException("Couldn't find token");
        }


        const loginReq = await this._requester.post("https://www.crunchyroll.com/ajax/", {
            'req': 'RpcApiTranslation_SetLang',
            'locale': lang,
            '_token': token
        });

        let newLang = await this.getLang();
        if (newLang == lang) {
            //console.log("Language changed to " + lang);
            return;
        } else {
            throw new RuntimeException("Couldn't change language. Currently selected: " + newLang)
        }
    }

    async getEpisodesFormUrl(url: string): Promise<Season[]> {
        let list: Season[] = [];
        let seasonNum = -1;
        let page;
        try {
            page = (await this._requester.get(url)).body;
        } catch (e) {
            if (e.status) {
                throw new NetworkException("Status " + e.status + ": " + e.statusText);
            } else {
                throw e;
            }
        }
        const regex = /(?:<a href="([^"]+)" title="([^"]+)"\s+class="portrait-element block-link titlefix episode">[^$]*<span class="series-title block ellipsis" dir="auto">\s*\S+ (\S+))|(?:<a href="#"\s+class="season-dropdown content-menu block text-link strong (?:open)? small-margin-bottom"\s+title="([^"]+)">[^<]+<\/a>)/gm;
        let m;
        list[0] = {
            name: "",
            episodes: []
        }
        while ((m = regex.exec(page)) !== null) {
            if (m[4]) {
                if (seasonNum != -1) list[seasonNum].episodes = list[seasonNum].episodes.reverse();
                seasonNum++;
                list[seasonNum] = {
                    name: m[4],
                    episodes: []
                };
            } else {
                if (seasonNum == -1) seasonNum = 0;
                list[seasonNum].episodes.push({
                    url: m[1],
                    name: m[2],
                    number: m[3]
                });
            }
        }
        if (seasonNum != -1) list[seasonNum].episodes = list[seasonNum].episodes.reverse();
        list = list.reverse();

        return list;
    }
}