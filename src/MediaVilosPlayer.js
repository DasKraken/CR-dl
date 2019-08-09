// @ts-check
const { UserInputException } = require("./Exceptions");
const langs = require('langs');
const m3u8 = require('m3u8');
function parseM3U(data) {
    return new Promise((resolve, reject) => {
        const parser = m3u8.createStream();
        // @ts-ignore
        parser.on('m3u', function (m3u) {
            resolve(m3u);
            // fully parsed m3u file
        });
        // @ts-ignore
        parser.on('error', function (err) {
            reject(err);
        });
        // @ts-ignore
        parser.write(data)
        // @ts-ignore
        parser.end();
    })
}

let _httpClient;

class SubtitleVilosPlayer {
    constructor(sub, isDefault) {
        this._sub = sub;
        this._isDefault = isDefault;
    }
    async getTitle() {
        return this._sub.title;
    }
    async getLanguage() {
        return this._sub.language;
    }
    async getLanguageISO6392T() {
        return langs.where("1", this._sub.language.substring(0, 2))["2T"];
    }
    async getData() {
        return (await _httpClient.get(this._sub.url)).body;
    }
    async isDefault() {
        return this._isDefault;
    }
}

class StreamVilosPlayer {
    constructor(stream, hardsubLang, audioLang) {
        this._stream = stream;
        this._hardsubLang = hardsubLang;
        this._audioLang = audioLang;
    }
    getHardsubLanguage() {
        return this._hardsubLang;
    }
    getAudioLanguage() {
        return this._audioLang;
    }
    getWidth() {
        return this._stream.attributes.attributes.resolution[0];
    }
    getHeight() {
        return this._stream.attributes.attributes.resolution[1];
    }
    getUrl() {
        return this._stream.properties.uri;
    }
}

class MediaVilosPlayer {

    constructor(html, url) {
        this._html = html;
        this._url = url;
        this._language = JSON.parse(this._html.match(/vilos\.config\.player\.language = ([^;]+);/)[1]);
        this._config = JSON.parse(this._html.match(/vilos\.config\.media = (.+);/)[1]);
    };
    async getSubtitles() {

        const subtitles = [];
        for (let i = 0; i < this._config.subtitles.length; i++) {
            const isDefault = this._config.subtitles[i].language == this._language;
            subtitles.push(new SubtitleVilosPlayer(this._config.subtitles[i], isDefault));
        }
        return subtitles;
    }

    async getDefaultLanguage() {
        return this._language;
    }

    async _loadStreamData(stream) {
        if (stream.data) return;
        stream.data = (await _httpClient.get(stream.url)).body;
    }
    async _getStreamForHardsubLang(hardSubLang) {
        for (const stream of this._config.streams) {
            if (stream.hardsub_lang == hardSubLang && stream.format == "adaptive_hls") {
                return stream;
            }
        }
        return null;
    }
    async getAvailableResolutions(hardSubLang) {


        const selectedStream = await this._getStreamForHardsubLang(hardSubLang);
        if (!selectedStream) {
            throw new UserInputException("No stream found for hardsub language: " + hardSubLang);
        }
        await this._loadStreamData(selectedStream);

        const availableResolutions = [];
        const regexResolutions = /RESOLUTION=[0-9]+x([0-9]+)/gm;
        let m;
        while ((m = regexResolutions.exec(selectedStream.data)) !== null) {
            const r = parseInt(m[1]);
            if (availableResolutions.indexOf(r) == -1) {
                availableResolutions.push(r);
            }
        }
        return availableResolutions;
    }
    async getStreams(resolution, hardSubLang) {
        const selectedStream = await this._getStreamForHardsubLang(hardSubLang);
        await this._loadStreamData(selectedStream);
        // selectedStream is a group of Streams in different resolutions. We need to filter out one resolution.

        const m3uData = await parseM3U(selectedStream.data);
        const streamList = [];
        for (const streamItem of m3uData.items.StreamItem) {
            if (streamItem.attributes.attributes.resolution[1] == resolution) {
                streamList.push(new StreamVilosPlayer(streamItem, selectedStream.hardsub_lang, selectedStream.audio_lang))
            }
        }
        return streamList;

    }
    async getEpisodeTitle() {
        return this._config.metadata.title;
    }
    async getSeriesTitle() {
        const seriesTitleMatch = /"mediaTitle":("[^"]+")/.exec(this._html);
        const seriesTitle = seriesTitleMatch ? JSON.parse(seriesTitleMatch[1]) : undefined;
        return seriesTitle;
    }
    async getSeasonTitle() {
        const seasonTitleMatch = /"seasonTitle":("[^"]+")/.exec(this._html);
        const seasonTitle = seasonTitleMatch ? JSON.parse(seasonTitleMatch[1]) : undefined;
        return seasonTitle;
    }
    async getEpisodeNumber() {
        return this._config.metadata.episode_number;
    }
}

function setHttpClientV(httpClient) {
    _httpClient = new httpClient();;
}

module.exports = { MediaVilosPlayer, setHttpClientV }