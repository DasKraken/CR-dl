const request = require('request');
const {
    NodeHttpClient,
    setCookieJar
} = require("./NodeHttpClient");
const CloudflareBypass = require("./CloudflareBypass");
const {
    UserInputException,
    RuntimeException,
    NetworkException
} = require("./Exceptions");
const SubtitleToAss = require("./SubtitleToAss");
const downloadVideoFromM3U = require("./m3u-download");
const processVideo = require("./processVideo");
const {
    getMedia,
    setHttpClient
} = require("crunchyroll-lib/index");
const fs = require("fs");
const langs = require('langs');
let format = require('string-format')
const mkdirp = require('mkdirp');
const removeDiacritics = require('diacritics').remove;

let jar = request.jar()
setCookieJar(jar);

// Set the Http client to Node
setHttpClient(NodeHttpClient);
const httpClientInstance = new NodeHttpClient();
const cloudflareBypass = new CloudflareBypass(httpClientInstance);

format = format.create({
    scene: s => {
        s = removeDiacritics(s);
        s = s.replace(/[^A-Za-z0-9\._-]/g, ".");
        s = s.replace(/\.{2,}/g, ".");
        s = s.replace(/-{2,}/g, "-");
        s = s.replace(/_{2,}/g, "_");
        s = s.replace(/[._-]{2,}/g, ".");
        s = s.replace(/^[._-]/, "");
        s = s.replace(/[._-]$/, "");
        return s;
    },
})

const resolutionOrder = [
    "360p",
    "480p",
    "720p",
    "1080p"
]

function pad(num, size) {
    var s = num + "";
    while (s.length < size) s = "0" + s;
    return s;
}

var deleteFolderRecursive = function (path) {
    if (fs.existsSync(path)) {
        fs.readdirSync(path).forEach(function (file, index) {
            var curPath = path + "/" + file;
            if (fs.lstatSync(curPath).isDirectory()) { // recurse
                deleteFolderRecursive(curPath);
            } else { // delete file
                fs.unlinkSync(curPath);
            }
        });
        fs.rmdirSync(path);
    }
};

function loadCookieJar() {
    if (fs.existsSync("cookies.data")) {
        const fileData = fs.readFileSync("cookies.data") + "";
        if (fileData.charAt(0) == "{") {
            jar._jar._importCookiesSync(JSON.parse(fileData));
        } else {
            loadAltCookies(fileData);
        }
    }
}

function loadAltCookies(c) {
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
    jar._jar._importCookiesSync(out);
    saveCookieJar();
}

function saveCookieJar() {
    fs.writeFileSync("cookies.data", JSON.stringify(jar._jar.serializeSync()));
}

function toFilename(str) {
    return str.replace(/[\\/:*?"<>|]+/g, "_")
}

function cleanUp() {
    try {
        deleteFolderRecursive("SubData");
    } catch (e) {};
    try {
        deleteFolderRecursive("VodVidData");
    } catch (e) {};
    try {
        fs.unlinkSync("VodVid.m3u8")
    } catch (e) {};
}

async function isLoggedIn() {
    let res = await httpClientInstance.get("http://www.crunchyroll.com/videos/anime");
    return res.body.indexOf("<a href=\"/logout\"") > -1
}

async function login(username, password) {
    loadCookieJar();
    let loginPage;
    try {
        loginPage = await cloudflareBypass.get("https://www.crunchyroll.com/login", {
            followRedirect: false
        });
    } catch (e) {
        loginPage = e;
    }
    if (loginPage.status == 302) {
        console.log("Already logged in!")
        return;
    }
    const loginTokenMatch = /name="login_form\[_token\]" value="([^"]+)" \/>/.exec(loginPage.body)
    if (!loginTokenMatch) {
        throw new Error("Error logging in: No login token found.");
    }
    const token = loginTokenMatch[1];

    let loginSend;
    try {
        loginSend = (await cloudflareBypass.post("https://www.crunchyroll.com/login", {
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

    /*try {
        const loginReq = await httpClientInstance.post("https://www.crunchyroll.com/?a=formhandler", {
            'formname': 'RpcApiUser_Login',
            'next_url': 'https://www.crunchyroll.com/acct/membership',
            'name': username,
            'password': password
        });
    } catch (e) {}

    if (await isLoggedIn()) {
        console.log("Login successful");
    } else {
        throw new UserInputException("Couldn't log in. Wrong credentials?")
    }*/

}
async function logout() {
    loadCookieJar();
    await cloudflareBypass.get("http://www.crunchyroll.com/logout");
    saveCookieJar();
}
async function getLang() {
    let res = await httpClientInstance.get("http://www.crunchyroll.com/videos/anime");
    return res.body.match(/<li><a href="#" onclick="return Localization\.SetLang\(&quot;([A-Za-z]{4})&quot;\);" data-language="[^"]+" class="selected">[^"]+<\/a><\/li>/)[1]
}
async function setLang(lang) {
    loadCookieJar();
    try {
        const loginReq = await httpClientInstance.post("http://www.crunchyroll.com/ajax/", {
            'req': 'RpcApiTranslation_SetLang',
            'locale': lang,
        });
    } catch (e) {}

    let newLang = await getLang();
    if (newLang == lang) {
        console.log("Language changed to " + lang);
    } else {
        throw new RuntimeException("Couldn't change language. Currently selected: " + newLang)
    }
    saveCookieJar();
}
async function getVideoData(url) {
    const page = (await httpClientInstance.get(url)).body;

    const regexResolutions = /<a href="(?!\/freetrial)[^"]+" token="showmedia.([^"]+)" class="[^"]+" title="[^"]+">[^<]+<\/a>/gm;
    const supportedResolutions = [];
    let m;
    while ((m = regexResolutions.exec(page)) !== null) {
        supportedResolutions.push(m[1]);

    }


    const seasonTitleMatch = /"seasonTitle":("[^"]+")/.exec(page);

    const seasonTitle = seasonTitleMatch ? JSON.parse(seasonTitleMatch[1]) : undefined;

    return {
        supportedResolutions,
        seasonTitle
    };
}

async function getMaxWantedResolution(videoData, res) {
    if (resolutionOrder.indexOf(res) == -1)
        throw new UserInputException("Unsupported resolution. Valid are: " + resolutionOrder.join(", "));
    res = res || "1080p";

    if (videoData.supportedResolutions.indexOf(res) > -1) {
        return res;
    }

    for (let i = resolutionOrder.length - 1; i >= 0; i--) {
        if (videoData.supportedResolutions.indexOf(resolutionOrder[i]) > -1) {
            console.log(`Resolution ${res} not available. Using ${resolutionOrder[i]} instead.`)
            return resolutionOrder[i];
        }
    }
    console.log(`No resolutions available. Trying ${resolutionOrder[0]}.`)
    return resolutionOrder[0];
}



async function downloadPlaylistUrl(url, resolution, onlySeason, options) {
    loadCookieJar();
    let list = [];
    let seasonNum = -1;
    let page;
    try {
        page = (await httpClientInstance.get(url)).body;
    } catch (e) {
        console.log("Error " + e.status)
    }
    const regex = /(?:<a href="([^"]+)" title="([^"]+)"\s+class="portrait-element block-link titlefix episode">)|(?:<a href="#"\s+class="season-dropdown content-menu block text-link strong (?:open)? small-margin-bottom"\s+title="([^"]+)">[^<]+<\/a>)/gm;
    let m;
    list[0] = {
        name: "",
        episodes: []
    }
    while ((m = regex.exec(page)) !== null) {
        if (m[3]) {
            if (seasonNum != -1) list[seasonNum].episodes = list[seasonNum].episodes.reverse();
            seasonNum++;
            list[seasonNum] = {
                name: m[3],
                episodes: []
            };
        } else {
            if (seasonNum == -1) seasonNum = 0;
            list[seasonNum].episodes.push({
                url: m[1],
                name: m[2]
            });
        }
    }
    if (seasonNum != -1) list[seasonNum].episodes = list[seasonNum].episodes.reverse();
    list = list.reverse();

    const origlist = list;

    if (onlySeason) {
        if (isNaN(onlySeason) || parseInt(onlySeason) > list.length || parseInt(onlySeason) < 1) {
            throw new UserInputException("Invalid season number: " + onlySeason);
            return;
        } else {
            list = [list[parseInt(onlySeason) - 1]];
        }
    }

    if (list.length == 1 && list[0].episodes.length == 0) {
        throw new UserInputException("No Episodes found.")
        return;
    }

    for (const season of list) {
        for (const episode of season.episodes) {
            console.log("Downloading S(" + pad(origlist.indexOf(season) + 1, 2) + "/" + pad(origlist.length, 2) + ")E(" + pad(season.episodes.indexOf(episode) + 1, 2) + "/" + pad(season.episodes.length, 2) + ") - " + episode.name);
            await downloadVideoUrl("http://www.crunchyroll.com" + episode.url, resolution, options)
        }
    }

    // console.log(JSON.stringify(list, undefined, "  "))
}

async function downloadsSubs(subtitles) {
    try {
        fs.mkdirSync("SubData")
    } catch (e) {}
    const subsAvailiable = [];
    for (let i = 0; i < subtitles.length; i++) {
        const stta = new SubtitleToAss(subtitles[i]);
        const subtitleModel = await stta.getModel();
        const langCode = langs.where("1", subtitleModel.langCode.substring(0, 2))["2T"];
        const langString = subtitles[i].getTitle().match(/\[(.*)\]/)[1];
        const title = langString;
        const ass = await stta.getContentAsAss();
        const filename = "SubData/" + subtitleModel.langCode + ".ass"
        fs.writeFileSync(filename, ass)
        subsAvailiable.push({
            title: title,
            language: langCode,
            langCode: subtitleModel.langCode,
            path: filename,
            default: subtitles[i].isDefault()
        })
    }
    return subsAvailiable;
}

const possibleSubValues = ["enUS", "esLA", "esES", "frFR", "ptBR", "arME", "itIT", "deDE", "ruRU", ]
async function verifySubList(list) {
    for (const lang of list) {
        if (possibleSubValues.indexOf(lang) == -1) {
            throw new UserInputException("Unknown subtitle language: " + lang + ". Supported languages are: " + possibleSubValues.join(", "));
        }
    }
}

async function downloadVideoUrl(url, resolution, options) {
    loadCookieJar();
    //if (options.subLangs) {
    //    await verifySubList(options.subLangs.split(","))
    //}
    const videoIdMatch = /([0-9]+)$/.exec(url);
    if (!videoIdMatch) {
        throw new UserInputException("Invalid video URL");
    }

    const videoData = await getVideoData(url);
    resolution = await getMaxWantedResolution(videoData, resolution)

    const media = await getMedia(videoIdMatch[1], resolution, url);

    //media.
    const subtitles = media.getSubtitles();
    const subsAvailiable = await downloadsSubs(subtitles);

    if (options.listSubs) {
        console.table(subsAvailiable);
        return;
    }

    let subsToInclude = [];
    if (options.subLangs) {
        const langs = options.subLangs.split(",")
        if (!options.subDefault) {
            options.subDefault = langs[0];
        }
        for (const lang of langs) {
            const sub = subsAvailiable.find((v) => {
                return v.langCode == lang
            });
            if (!sub) {
                console.error("Subtitles for " + lang + " not available. Skipping...");
            } else {
                subsToInclude.push(sub);
            }
        }
    } else {
        subsToInclude = subsAvailiable;
    }

    if (options.subDefault) {
        let defaultSet = false;
        for (const sub of subsToInclude) {
            if (sub.langCode == options.subDefault) {
                sub.default = true;
                defaultSet = true;
            } else {
                sub.default = false;
            }
        }
        if (!defaultSet) {
            throw new UserInputException("Couldn't set " + options.subDefault + " as default subtitle: subtitle not available.")
        }
    }

    console.log("Following subtitles will be included: ")
    console.table(subsToInclude);

    const metadata = {
        episodeTitle: media.getMetadata().getEpisodeTitle(),
        seriesTitle: media.getMetadata().getSeriesTitle(),
        episodeNumber: media.getMetadata().getEpisodeNumber(),
        seasonTitle: videoData.seasonTitle || media.getMetadata().getSeriesTitle(),
        resolution: resolution,
    }

    if (!isNaN(metadata.episodeNumber)) {
        metadata.episodeNumber = pad(metadata.episodeNumber, 2)
    }

    const formatData = {};
    for (const prop in metadata) {
        formatData[prop] = toFilename(metadata[prop]);
    }

    options.output = options.output || "{seasonTitle} [{resolution}]/{seasonTitle} - {episodeNumber} - {episodeTitle} [{resolution}].mkv"
    const outputPath = format(options.output, formatData)

    const outputDirectory = outputPath.substring(0, outputPath.lastIndexOf("/"));
    if (outputDirectory.length > 0) {
        mkdirp.sync(outputDirectory);
    }
    await downloadVideoFromM3U(media.getStream().getFile(), "VodVid", options)
    await processVideo("VodVid.m3u8", metadata, subsToInclude, outputPath, options)
    saveCookieJar();
    cleanUp();
}

module.exports = {
    downloadVideoUrl,
    downloadPlaylistUrl,
    login,
    logout,
    cleanUp,
    isLoggedIn,
    setLang,
    getLang
}