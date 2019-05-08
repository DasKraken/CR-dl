// @ts-check
const {
    getMedia,
    setHttpClient
} = require("crunchyroll-lib/index");
const {
    UserInputException,
    RuntimeException,
    NetworkException
} = require("./Exceptions");
const SubtitleToAss = require("./SubtitleToAss");
const langs = require('langs');

async function getMediaByUrl(url, optionsOrVideoQuality, options) {
    let mediaId = /www\.crunchyroll\.com\/(?:[a-z-]{1,5}\/)?[^/]+\/[^/]+-([0-9]+)$/.exec(url)[1];
    return await getMedia(mediaId, url, optionsOrVideoQuality, options);

}



class SubtitleLegacyPlayer {
    constructor(sub) {
        this._sub = sub;
        this._stta = new SubtitleToAss(sub);
    }
    async getTitle() {
        //From: [English (US)] English (US)
        return this._sub.getTitle().match(/\[(.*)\]/)[1]
    }
    async getLanguage() {
        const subtitleModel = await this._stta.getModel();
        return subtitleModel.langCode;
    }
    async getLanguageISO6392T() {
        const subtitleModel = await this._stta.getModel();
        return langs.where("1", subtitleModel.langCode.substring(0, 2))["2T"];
    }
    async getData() {
        return await this._stta.getContentAsAss();
    }
    async isDefault() {
        return this._sub.isDefault();
    }
}

class StreamLegacyPlayer {
    constructor(stream) {
        this._stream = stream;
    }
    getHardsubLanguage() {
        return null;
    }
    getAudioLanguage() {
        return "jaJP";
    }
    getWidth() {
        return this._stream.getWidth();
    }
    getHeight() {
        return this._stream.getHeight();
    }
    getUrl() {
        return this._stream.getFile();
    }
}
class MediaLegacyPlayer {

    constructor(html, url) {
        this._html = html;
        this._url = url;
    };
    async getSubtitles() {

        if (!this._CLMedia) {
            this._CLMedia = await getMediaByUrl(this._url, "1080p");
            this._CLMediaResolution = "1080p";
        }
        const subtitlesCustom = [];
        const subtitles = this._CLMedia.getSubtitles();
        for (let i = 0; i < subtitles.length; i++) {
            subtitlesCustom.push(new SubtitleLegacyPlayer(subtitles[i]));
        }
        return subtitlesCustom;
    }

    async getDefaultLanguage() {
        if (!this._CLMedia) {
            this._CLMedia = await getMediaByUrl(this._url, "1080p");
            this._CLMediaResolution = "1080p";
        }
        const subtitles = this._CLMedia.getSubtitles();
        for (let i = 0; i < subtitles.length; i++) {
            if (subtitles[i].isDefault()) {
                return await (new SubtitleLegacyPlayer(subtitles[i])).getLanguage();
            }
        }
        return null;
    }

    async getAvailableResolutions(hardSubLang) {
        if (hardSubLang) {
            throw new UserInputException("No Hardsub available in Flash Player");
        }

        const availableResolutions = [];
        const regexResolutions = /<a href="(?!\/freetrial)[^"]+" token="showmedia.([^"]+)p" class="[^"]+" title="[^"]+">[^<]+<\/a>/gm;
        let m;
        while ((m = regexResolutions.exec(this._html)) !== null) {
            availableResolutions.push(parseInt(m[1]));

        }
        return availableResolutions;
    }
    async getStreams(resolution, hardSub) {
        if (hardSub) {
            throw new UserInputException("No Hardsub available in Flash Player");
        }
        if (!this._CLMedia || this._CLMediaResolution != resolution) {
            // @ts-ignore
            this._CLMedia = await getMediaByUrl(this._url, resolution + "p");
            this._CLMediaResolution = resolution;
        }
        return [new StreamLegacyPlayer(this._CLMedia.getStream())]
    }
    async getEpisodeTitle() {
        if (!this._CLMedia) {
            this._CLMedia = await getMediaByUrl(this._url, "1080p");
            this._CLMediaResolution = "1080p";
        }
        return this._CLMedia.getMetadata().getEpisodeTitle();
    }
    async getSeriesTitle() {
        if (!this._CLMedia) {
            this._CLMedia = await getMediaByUrl(this._url, "1080p");
            this._CLMediaResolution = "1080p";
        }
        return this._CLMedia.getMetadata().getSeriesTitle();
    }
    async getSeasonTitle() {
        const seasonTitleMatch = /"seasonTitle":("[^"]+")/.exec(this._html);
        const seasonTitle = seasonTitleMatch ? JSON.parse(seasonTitleMatch[1]) : undefined;
        return seasonTitle;
    }
    async getEpisodeNumber() {
        if (!this._CLMedia) {
            this._CLMedia = await getMediaByUrl(this._url, "1080p");
            this._CLMediaResolution = "1080p";
        }
        return this._CLMedia.getMetadata().getEpisodeNumber();
    }
}


module.exports = { MediaLegacyPlayer, setHttpClientL: setHttpClient }