
import cloudscraper from "../requester/cloudscraper";
import * as request from "request";
import got from "../requester/got";
import { RuntimeError, UserInputError } from "../Errors";
import { Requester, RequesterCdn } from "../types/Requester";
import { Language } from "../types/language";
import { VilosVideoInfo } from "./MediaVilosPlayer";
import { VideoInfo } from "../interfaces/video";
import { AllHtmlEntities } from "html-entities";



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
    isRegionBlocked: boolean;
    isLanguageUnavailable: boolean;
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
        const res = await this._requester.get("http://www.crunchyroll.com/videos/anime");
        return res.body.indexOf("<a href=\"/logout\"") > -1;
    }

    async login(username: string, password: string): Promise<void> {
        const loginPage: { body: Buffer; url: string } = await this._requester.get("https://www.crunchyroll.com/login");

        const loginTokenMatch = /name="login_form\[_token\]" value="([^"]+)" \/>/.exec(loginPage.body.toString());
        if (!loginTokenMatch) {
            throw new RuntimeError("Error logging in: No login token found.");
        }
        const token = loginTokenMatch[1];
        try {
            await this._requester.post(loginPage.url, {
                "login_form[_token]": token,
                "login_form[name]": username,
                "login_form[password]": password,
                "login_form[redirect_url]": "/"
            });
        } catch (e) {
            console.log(e);

        }
        if (await this.isLoggedIn()) {
            return;
        } else {
            throw new UserInputError("Couldn't log in. Wrong credentials?");
        }

    }
    async logout(): Promise<void> {
        await this._requester.get("http://www.crunchyroll.com/logout");
        if (await this.isLoggedIn()) {
            throw new RuntimeError("Couldn't log out.");
        } else {
            return;
        }
    }

    async getLang(): Promise<Language> {
        const res = await this._requester.get("http://www.crunchyroll.com/videos/anime");
        const m = res.body.toString().match(/<a href="[^"]+"\s*onclick="return Localization\.SetLang\(\s*'([A-Za-z]{4})',\s*'[^']+',\s*'[^']+'\s*\);"\s*data-language="[^"]+"\s*class="selected">[^<]+<\/a>/);
        if (m) {
            return m[1] as Language;
        } else {
            throw new RuntimeError("Couldn't find Language");
        }
    }
    async setLang(lang: Language): Promise<void> {
        const res = await this._requester.get("http://www.crunchyroll.com/videos/anime");
        const tokenMatch = res.body.toString().match(/<a href="[^"]+"\s*onclick="return Localization\.SetLang\(\s*'[A-Za-z]{4}',\s*'([^']+)',\s*'[^']+'\s*\);"\s*data-language="[^"]+"\s*class="selected">[^<]+<\/a>/);
        let token;
        if (tokenMatch) {
            token = tokenMatch[1];
        } else {
            throw new RuntimeError("Couldn't find token");
        }


        await this._requester.post("https://www.crunchyroll.com/ajax/", {
            "req": "RpcApiTranslation_SetLang",
            "locale": lang,
            "_token": token
        });

        const newLang = await this.getLang();
        if (newLang == lang) {
            //console.log("Language changed to " + lang);
            return;
        } else {
            throw new RuntimeError("Couldn't change language. Currently selected: " + newLang);
        }
    }

    async getEpisodesFormUrl(url: string): Promise<Season[]> {
        const list: Season[] = [];
        let seasonNum = -1;
        const page: string = (await this._requester.get(url)).body.toString();


        const regionBlockedSeasons: string[] = Array.from(page.matchAll(/<p class="availability-notes-low">[^<]+: ([^<]+)<\/p>/g)).map((v: RegExpMatchArray) => AllHtmlEntities.decode(v[1]));
        const languageBlockedSeasons: string[] = Array.from(page.matchAll(/<p class="availability-notes-low">([^<]+) (?:ist in|no está|is not|n'est pas|non è|недоступен)[^<]+<\/p>/g)).map((v: RegExpMatchArray) => AllHtmlEntities.decode(v[1]));

        console.log(regionBlockedSeasons);
        console.log(languageBlockedSeasons);

        const regex = /(?:<a href="([^"]+)" title="([^"]+)"\s+class="portrait-element block-link titlefix episode">[^$]*<span class="series-title block ellipsis" dir="auto">\s*\S+ (\S+))|(?:<a href="#"\s+class="season-dropdown content-menu block text-link strong (?:open)? small-margin-bottom"\s+title="([^"]+)">[^<]+<\/a>)/gm;
        let m: RegExpExecArray | null;
        list[0] = {
            name: "",
            episodes: [],
            isLanguageUnavailable: languageBlockedSeasons.length > 0,
            isRegionBlocked: regionBlockedSeasons.length > 0
        };
        while ((m = regex.exec(page)) !== null) {
            if (m[4]) {
                if (seasonNum != -1) list[seasonNum].episodes = list[seasonNum].episodes.reverse();
                seasonNum++;
                const seasonName = AllHtmlEntities.decode(m[4]);
                list[seasonNum] = {
                    name: seasonName,
                    episodes: [],
                    isLanguageUnavailable: languageBlockedSeasons.includes(seasonName),
                    isRegionBlocked: regionBlockedSeasons.includes(seasonName)
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
        list.reverse();

        return list;
    }

    async loadEpisode(url: string): Promise<VideoInfo> {
        const html = (await this._requester.get(url)).body.toString();
        return new VilosVideoInfo(html, url, this._requesterCdn);
    }
}
