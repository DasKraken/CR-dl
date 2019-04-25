import * as request from 'request';
import {
    NodeHttpClient,
    setCookieJar
} from "./NodeHttpClient";
import CloudflareBypass from "./CloudflareBypass";
import {
    UserInputException,
    RuntimeException,
    NetworkException
} from "./Exceptions";
import downloadVideoFromM3U from "./m3u-download";
import processVideo from "./processVideo";
import {
    MediaVilosPlayer,
    setHttpClientV
} from "./MediaVilosPlayer";
import * as fs from "fs";
import * as format_ from 'string-format';
import * as mkdirp from 'mkdirp';
import * as path from 'path';
import { pad, deleteFolderRecursive, toFilename, formatScene } from './Utils';

let jar = request.jar()
setCookieJar(jar);

// Set the Http client to Node
setHttpClientV(NodeHttpClient);

const httpClientInstance = new NodeHttpClient();
const cloudflareBypass = new CloudflareBypass(httpClientInstance);

const format = format_.create({
    scene: formatScene
})

function loadCookieJar() {
    if (fs.existsSync("cookies.data")) {
        const fileData = fs.readFileSync("cookies.data") + "";
        if (fileData.charAt(0) == "{") {
            // @ts-ignore
            jar._jar._importCookiesSync(JSON.parse(fileData));
        } else {
            loadAltCookies(fileData);
        }
    }
}

function loadAltCookies(c: string) {
    const out = {
        "version": "tough-cookie@2.3.4",
        "storeType": "MemoryCookieStore",
        "rejectPublicSuffixes": true,
        "cookies": []
    }
    const now = (new Date()).toISOString();
    const inMonth = (new Date(Date.now() + 2592000000)).toISOString();
    const cooks = c.split(/; */);
    for (let i = 0; i < cooks.length; i++) {
        const o = cooks[i];
        const key = o.substring(0, o.indexOf('='))
        const value = o.substring(o.indexOf('=') + 1)
        out.cookies.push({
            key: key,
            value: value,
            domain: "crunchyroll.com",
            path: "/",
            hostOnly: false,
            creation: now,
            lastAccessed: now,
            expires: inMonth,
            maxAge: 2592000
        })
    }
    // @ts-ignore
    jar._jar._importCookiesSync(out);
    saveCookieJar();
}

function saveCookieJar() {
    // @ts-ignore
    fs.writeFileSync("cookies.data", JSON.stringify(jar._jar.serializeSync()));
}

export function cleanUp(options?: { tmpDir: string }) {
    const dir = (options && options.tmpDir) || "tmp/";
    try {
        deleteFolderRecursive(dir);
    } catch (e) { };
}

export async function isLoggedIn() {
    loadCookieJar();
    let res = await cloudflareBypass.get("http://www.crunchyroll.com/videos/anime");
    saveCookieJar();
    return res.body.indexOf("<a href=\"/logout\"") > -1
}

export async function login(username: string, password: string) {
    loadCookieJar();
    if (await isLoggedIn()) {
        console.log("Already logged in!");
        return;
    }
    let loginPage;
    try {
        loginPage = await cloudflareBypass.get("https://www.crunchyroll.com/login", {
            followRedirect: true
        });
    } catch (e) {
        if (e.status) {
            throw new NetworkException("Status " + e.status + ": " + e.statusText);
        } else {
            throw e;
        }
    }
    const loginTokenMatch = /name="login_form\[_token\]" value="([^"]+)" \/>/.exec(loginPage.body)
    if (!loginTokenMatch) {
        throw new RuntimeException("Error logging in: No login token found.");
    }
    const token = loginTokenMatch[1];

    let loginSend;
    try {
        loginSend = (await cloudflareBypass.post(loginPage.url, {
            "login_form[_token]": token,
            "login_form[name]": username,
            "login_form[password]": password,
            "login_form[redirect_url]": "/"
        }));
    } catch (e) {
        loginSend = e;
    }
    saveCookieJar();
    if (loginSend.status == 302 && await isLoggedIn()) {
        console.log("Login successful");
        return;
    } else {
        throw new UserInputException("Couldn't log in. Wrong credentials?");
    }

}
export async function logout() {
    loadCookieJar();
    await cloudflareBypass.get("http://www.crunchyroll.com/logout");
    saveCookieJar();
}
export async function getLang() {
    let res = await cloudflareBypass.get("http://www.crunchyroll.com/videos/anime");
    return res.body.match(/<a href="[^"]+"\s*onclick="return Localization\.SetLang\(\s*'([A-Za-z]{4})',\s*'[^']+',\s*'[^']+'\s*\);"\s*data-language="[^"]+"\s*class="selected">[^<]+<\/a>/)[1]
}
export async function setLang(lang: string) {
    loadCookieJar();
    let res = await cloudflareBypass.get("http://www.crunchyroll.com/videos/anime");
    let token = res.body.match(/<a href="[^"]+"\s*onclick="return Localization\.SetLang\(\s*'[A-Za-z]{4}',\s*'([^']+)',\s*'[^']+'\s*\);"\s*data-language="[^"]+"\s*class="selected">[^<]+<\/a>/)[1]


    const loginReq = await cloudflareBypass.post("https://www.crunchyroll.com/ajax/", {
        'req': 'RpcApiTranslation_SetLang',
        'locale': lang,
        '_token': token
    });

    let newLang = await getLang();
    if (newLang == lang) {
        console.log("Language changed to " + lang);
    } else {
        console.log(loginReq)
        throw new RuntimeException("Couldn't change language. Currently selected: " + newLang)
    }
    saveCookieJar();
}

async function getMaxWantedResolution(availableResolutions: number[], res: number | string) {
    if (typeof res == "string" && res.endsWith("p")) {
        res = res.substr(0, res.length - 1);
    }
    res = parseInt(<string>res);
    if (isNaN(res)) throw new UserInputException("Invalid resolution.");

    if (availableResolutions.indexOf(res) > -1) {
        return res;
    }
    availableResolutions = availableResolutions.sort((a, b) => a - b)
    console.log(availableResolutions)
    for (let i = availableResolutions.length - 1; i >= 0; i--) {
        if (availableResolutions[i] <= res) {
            console.log(`Resolution ${res}p not available. Using ${availableResolutions[i]}p instead.`)
            return availableResolutions[i];
        }
    }
    throw new RuntimeException(`No resolutions found.`);

}

interface Episode {
    url: string;
    name: string;
    number: string; // Episode number can also be non numerical
}
interface Season {
    name: string;
    episodes: Episode[];
}

async function getEpisodesFormUrl(url: string) {
    loadCookieJar();
    let list: Season[] = [];
    let seasonNum = -1;
    let page;
    try {
        page = (await cloudflareBypass.get(url)).body;
    } catch (e) {
        if (e.status) {
            throw new NetworkException("Status " + e.status + ": " + e.statusText);
        } else {
            throw e;
        }
    }
    saveCookieJar();
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

export async function downloadPlaylistUrl(url: string, resolution: number | string, options) {

    const list = await getEpisodesFormUrl(url);

    let seasonsToDownload = list;

    // select season(s)
    if (options.season) {
        const wantedSeasons = options.season.split(",").reduce((r, n) => {
            const bounds = n.split("-");

            if (bounds.length == 1) {
                if (isNaN(bounds[0]) || bounds[0] == "") throw new UserInputException(`Season number "${bounds[0]}" invalid.`);
                r.push(parseInt(bounds[0]) - 1);
            } else if (bounds.length == 2) {
                if (isNaN(bounds[0]) || bounds[0] == "") throw new UserInputException(`Season number "${bounds[0]}" invalid.`);
                if (isNaN(bounds[1]) || bounds[1] == "") throw new UserInputException(`Season number "${bounds[1]}" invalid.`);
                for (let i = parseInt(bounds[0]); i <= parseInt(bounds[1]); i++) {
                    r.push(i - 1);
                }
            } else {
                throw new UserInputException(`Season number "${n}" invalid.`);
            }
            return r;
        }, []);
        seasonsToDownload = [];
        for (const s of wantedSeasons) {
            if (!list[s]) throw new UserInputException(`Season ${s + 1} not available.`);
            seasonsToDownload.push(list[s]);
        }
    }

    // Remove empty seasons
    seasonsToDownload = seasonsToDownload.filter((s) => s.episodes.length > 0);

    if (seasonsToDownload.length == 0) throw new UserInputException("No Episodes found.")

    // select episode(s)
    if (options.episode) {
        // if episode number numeric, convert number to string and back to number to normalize representation (e.g. leading zeros)
        seasonsToDownload.forEach(s => s.episodes = s.episodes.map((e) => { if (!isNaN(Number(e.number))) e.number = Number(e.number) + ""; return e }));

        const getEpisodeFromNumber = (number: string) => {
            if (!isNaN(Number(number))) number = Number(number) + "";
            const results = [];
            for (let seasonIndex = 0; seasonIndex < seasonsToDownload.length; seasonIndex++) {
                const season = seasonsToDownload[seasonIndex].episodes;
                for (let episodeIndex = 0; episodeIndex < season.length; episodeIndex++) {
                    const episode = season[episodeIndex];
                    if (episode.number == number) {
                        results.push({ seasonIndex, episodeIndex })
                    }
                }
            }
            if (results.length == 0) {
                throw new UserInputException(`Episode "${number}" not found.`)
            } else if (results.length == 1) {
                return results[0];
            } else {
                let areAllMatchesInSameSeason = true;
                for (let index = 0; index < results.length - 1; index++) {
                    if (results[index].seasonIndex != results[index + 1].seasonIndex)
                        areAllMatchesInSameSeason = false;
                }
                if (areAllMatchesInSameSeason) {
                    console.log(`Warning: Multiple episodes found matching "${number}". Selecting first.`)
                    return results[0];
                } else {
                    throw new UserInputException(`Collision between seasons for episode "${number}". Please specify one season with --season to use --episodes.`)
                }
            }
        }
        const addEpisodesInRange = (result, start, end) => {
            let curSeason = start.seasonIndex;
            let curEpisode = start.episodeIndex;

            while (curSeason < end.seasonIndex || (curSeason == end.seasonIndex && curEpisode <= end.episodeIndex)) {
                result.push(seasonsToDownload[curSeason].episodes[curEpisode]);

                if (curEpisode < seasonsToDownload[curSeason].episodes.length - 1) {
                    curEpisode++;
                } else {
                    curSeason++;
                    curEpisode = 0;
                }
            }
        }


        let episodesToDownload = options.episode.split(",").reduce((r, n) => {
            const bounds = n.split("-");
            if (bounds.length == 1) {
                let ep = getEpisodeFromNumber(n);
                r.push(seasonsToDownload[ep.seasonIndex].episodes[ep.episodeIndex]);
            } else if (bounds.length == 2) {
                const min = getEpisodeFromNumber(bounds[0]);
                const max = getEpisodeFromNumber(bounds[1]);
                addEpisodesInRange(r, min, max);
            } else {
                throw new UserInputException("Invalid episode number: " + n);
            }
            return r
        }, [])

        seasonsToDownload.forEach(value => { value.episodes = value.episodes.filter(ep => episodesToDownload.indexOf(ep) > -1) })
    }



    // Remove empty seasons (again)
    seasonsToDownload = seasonsToDownload.filter((s) => s.episodes.length > 0);

    if (seasonsToDownload.length == 0) throw new UserInputException("No Episodes selected.")



    //console.log(require('util').inspect(seasonsToDownload, false, null, true /* enable colors */))

    console.log("Following episodes will be dowloaded:");

    for (const s of seasonsToDownload) {
        if (s.name != "") console.log(`Season "${s.name}":`);
        console.log(s.episodes.map((e) => e.number).join(", "))
        console.log();
    }

    for (const season of seasonsToDownload) {
        for (const episode of season.episodes) {
            console.log();
            console.log(`Downloading S(${pad(seasonsToDownload.indexOf(season) + 1, 2)}/${pad(seasonsToDownload.length, 2)})E(${pad(season.episodes.indexOf(episode) + 1, 2)}/${pad(season.episodes.length, 2)}) - ${episode.name}`);
            await downloadVideoUrl("http://www.crunchyroll.com" + episode.url, resolution, options)
        }
    }

    // console.log(JSON.stringify(list, undefined, "  "))
}

async function getSubtitleByLanguage(subtitles, language) {
    let sub;
    for (const subt of subtitles) {
        if (await subt.getLanguage() == language) {
            sub = subt;
            break;
        }
    };
    return sub;
}

async function getSubsToInclude(subtitles, options) {
    let subsToInclude = [];
    const dir = path.join(options.tmpDir, "SubData")
    mkdirp.sync(dir);
    const langs = options.subLangs.split(",")
    for (const lang of langs) {
        if (lang == "none") continue;

        const sub = await getSubtitleByLanguage(subtitles, lang);
        if (!sub) {
            console.error("Subtitles for " + lang + " not available. Skipping...");
        } else {
            const filePath = path.join(dir, await sub.getLanguage() + ".ass");
            fs.writeFileSync(filePath, await sub.getData());
            subsToInclude.push({
                title: await sub.getTitle(),
                path: filePath,
                language: await sub.getLanguageISO6392T(),
                langCode: await sub.getLanguage(),
                default: false
            });
        }
    }

    let defaultSet = false;
    for (const sub of subsToInclude) {
        if (sub.langCode == options.subDefault) {
            sub.default = true;
            defaultSet = true;
        } else {
            sub.default = false;
        }
    }
    if (!defaultSet && options.subDefault != "none") {
        throw new UserInputException("Couldn't set " + options.subDefault + " as default subtitle: subtitle not available.")
    }

    if (subsToInclude.length > 0) {
        console.log("Following subtitles will be included: ")
        console.table(subsToInclude, ["title", "langCode", "default"]);
    } else {
        console.log("No subtitles will be included.")
    }

    return subsToInclude;
}


async function downloadSubsOnly(subtitlesToInclude, outputPath) {
    if (outputPath.lastIndexOf("/") < outputPath.lastIndexOf(".")) {
        outputPath = outputPath.substr(0, outputPath.lastIndexOf("."));
    }
    for (const sub of subtitlesToInclude) {
        fs.renameSync(sub.path, `${outputPath}.${sub.langCode}.ass`);
    }
}

export async function downloadVideoUrl(url, resolution, options) {
    loadCookieJar();

    let html;
    try {
        html = (await cloudflareBypass.get(url)).body;
    } catch (e) {
        if (e.status) {
            throw new NetworkException("Status " + e.status + ": " + e.statusText);
        } else {
            throw e;
        }
    }
    saveCookieJar();
    let media;
    if (html.indexOf("vilos.config.media") == -1) {
        // Flash Player
        //console.log("(Flash Player)")
        throw new Error("Player not supported")
        //media = new MediaLegacyPlayer(html, url);
    } else {
        // Vilos Player
        console.log("(HTML5 Player)")
        media = new MediaVilosPlayer(html, url);
    }

    const subtitles = await media.getSubtitles();
    if (options.listSubs) {
        // List subs. Do not download.
        const subsTable = [];
        for (const sub of subtitles) {
            subsTable.push({ title: await sub.getTitle(), langCode: await sub.getLanguage(), isDefault: await sub.isDefault() });
        }
        console.table(subsTable);
        return
    }


    if (!options.subDefault) {
        if (options.subLangs) {
            const langs = options.subLangs.split(",")
            options.subDefault = langs[0];
        } else if (subtitles.length == 0) {
            options.subDefault = "none";
        } else {
            options.subDefault = await media.getDefaultLanguage();
        }
    }
    if (!options.subLangs) {
        if (options.hardsub) {
            options.subLangs = options.subDefault;
        } else {
            let subLangs = [];
            for (const sub of subtitles) {
                subLangs.push(await sub.getLanguage());
            }
            options.subLangs = subLangs.join(",");
        }

    }
    let subsToInclude;
    if (options.hardsub) {
        if (options.subLangs.split(",").length > 1) throw new UserInputException("Cannot embed multiple subtitles with --hardsub");
        options.hardsubLang = options.subDefault;
        subsToInclude = [];

        console.log(`Selected "${options.hardsubLang}" as hardsub language.`)
    } else {
        options.hardsubLang = null;
        subsToInclude = await getSubsToInclude(subtitles, options);
    }

    let selectedStream
    if (!options.subsOnly) {
        resolution = await getMaxWantedResolution(await media.getAvailableResolutions(options.hardsubLang), resolution);

        // We may get multiple streams on different servers. Just take first.
        selectedStream = (await media.getStreams(resolution, options.hardsubLang))[0];
    }


    const metadata = {
        episodeTitle: await media.getEpisodeTitle(),
        seriesTitle: await media.getSeriesTitle(),
        episodeNumber: await media.getEpisodeNumber(),
        seasonTitle: await media.getSeasonTitle(),
        resolution: options.subsOnly ? "subtitles" : selectedStream.getHeight() + "p",
    }

    if (!isNaN(metadata.episodeNumber)) {
        metadata.episodeNumber = pad(metadata.episodeNumber, 2)
    }

    const formatData = {};
    for (const prop in metadata) {
        formatData[prop] = toFilename(metadata[prop]);
    }

    if (!options.output) {
        if (options.subsOnly) {
            options.output = "{seasonTitle} [subtitles]/{seasonTitle} - {episodeNumber} - {episodeTitle}.ass";
        } else {
            options.output = "{seasonTitle} [{resolution}]/{seasonTitle} - {episodeNumber} - {episodeTitle} [{resolution}].mkv";
        }
    }
    const outputPath = format(options.output, formatData)

    console.log(`Downloading to "${outputPath}"...`);

    const outputDirectory = outputPath.substring(0, outputPath.lastIndexOf("/"));
    if (outputDirectory.length > 0) {
        mkdirp.sync(outputDirectory);
    }
    if (options.subsOnly) {
        await downloadSubsOnly(subsToInclude, outputPath);
    } else {
        const m3u8File = await downloadVideoFromM3U(selectedStream.getUrl(), "VodVid", options)
        await processVideo(m3u8File, metadata, subsToInclude, outputPath, options)
    }
    saveCookieJar();
    cleanUp(options);
}
