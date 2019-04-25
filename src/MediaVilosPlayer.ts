import { UserInputException } from "./Exceptions";
import * as langs from 'langs';
import * as m3u8 from 'm3u8';
function parseM3U(data: string) {
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
    _sub: VilosMediaConfigSubtitle;
    _isDefault: boolean;
    constructor(sub: VilosMediaConfigSubtitle, isDefault: boolean) {
        this._sub = sub;
        this._isDefault = isDefault;
    }
    async getTitle(): Promise<string> {
        return this._sub.title;
    }
    async getLanguage(): Promise<string> {
        return this._sub.language;
    }
    async getLanguageISO6392T(): Promise<string> {
        return langs.where("1", this._sub.language.substring(0, 2))["2T"];
    }
    async getData(): Promise<string> {
        return (await _httpClient.get(this._sub.url)).body;
    }
    async isDefault(): Promise<boolean> {
        return this._isDefault;
    }
}

class StreamVilosPlayer {
    _stream;
    _hardsubLang: string;
    _audioLang: string;
    constructor(stream, hardsubLang: string, audioLang: string) {
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
    getWidth(): number {
        return this._stream.attributes.attributes.resolution[0];
    }
    getHeight(): number {
        return this._stream.attributes.attributes.resolution[1];
    }
    getUrl(): string {
        return this._stream.properties.uri;
    }
}

interface VilosMediaConfigSubtitle {
    language: string;
    url: string;
    title: string;
    format: string; // currently always "ass"
}
interface VilosMediaConfigStream {
    format: string; // always "hls" for now
    audio_lang: string;
    hardsub_lang: string;
    url: string;
    resolution: string; // currently always "adaptive"

    data?: string;
}

interface VilosMediaConfig {
    metadata: {
        id: string;
        type: string;
        channel_id: any;
        title: string;
        description: string;
        episode_number: string;
        display_episode_number: string;
        is_mature: boolean;
        duration: number;
    };
    thumbnail: {
        url: string;
    };
    streams: VilosMediaConfigStream[];
    ad_breaks: {
        type: string; // "preroll"/"midroll"
        offset: number;
    }[];
    subtitles: VilosMediaConfigSubtitle[];
}

export class MediaVilosPlayer {
    _html: string;
    _url: string;
    _language: string;
    _config: VilosMediaConfig;
    constructor(html: string, url: string) {
        this._html = html;
        this._url = url;
        this._language = JSON.parse(this._html.match(/vilos\.config\.player\.language = ([^;]+);/)[1]);
        this._config = JSON.parse(this._html.match(/vilos\.config\.media = (.+);/)[1]);
    };
    async getSubtitles(): Promise<SubtitleVilosPlayer[]> {
        const subtitles: SubtitleVilosPlayer[] = [];
        for (let i = 0; i < this._config.subtitles.length; i++) {
            const isDefault = this._config.subtitles[i].language == this._language;
            subtitles.push(new SubtitleVilosPlayer(this._config.subtitles[i], isDefault));
        }
        return subtitles;
    }

    async getDefaultLanguage(): Promise<string> {
        return this._language;
    }

    async _loadStreamData(stream: VilosMediaConfigStream) {
        if (stream.data) return;
        stream.data = (await _httpClient.get(stream.url)).body;
    }
    async _getStreamForHardsubLang(hardSubLang: string) {
        for (const stream of this._config.streams) {
            if (stream.hardsub_lang == hardSubLang) {
                return stream;
            }
        }
        return null;
    }
    async getAvailableResolutions(hardSubLang: string) {


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
    async getStreams(resolution, hardSubLang): Promise<StreamVilosPlayer[]> {
        const selectedStream = await this._getStreamForHardsubLang(hardSubLang);
        await this._loadStreamData(selectedStream);
        // selectedStream is a group of Streams in different resolutions. We need to filter out one resolution.

        const m3uData: any = await parseM3U(selectedStream.data);
        const streamList: StreamVilosPlayer[] = [];
        for (const streamItem of m3uData.items.StreamItem) {
            if (streamItem.attributes.attributes.resolution[1] == resolution) {
                streamList.push(new StreamVilosPlayer(streamItem, selectedStream.hardsub_lang, selectedStream.audio_lang))
            }
        }
        return streamList;

    }
    async getEpisodeTitle(): Promise<string> {
        return this._config.metadata.title;
    }
    async getSeriesTitle(): Promise<string> {
        const seriesTitleMatch = /"mediaTitle":("[^"]+")/.exec(this._html);
        const seriesTitle = seriesTitleMatch ? JSON.parse(seriesTitleMatch[1]) : undefined;
        return seriesTitle;
    }
    async getSeasonTitle(): Promise<string> {
        const seasonTitleMatch = /"seasonTitle":("[^"]+")/.exec(this._html);
        const seasonTitle = seasonTitleMatch ? JSON.parse(seasonTitleMatch[1]) : undefined;
        return seasonTitle;
    }
    async getEpisodeNumber(): Promise<string> {
        return this._config.metadata.episode_number;
    }
}

export function setHttpClientV(httpClient) {
    _httpClient = new httpClient();;
}
