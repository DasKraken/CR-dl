import { UserInputError, RuntimeError } from "../Errors";
import * as langs from "langs";
import { RequesterCdn } from "../types/Requester";
import { VideoInfo, SubtitleInfo, StreamInfo } from "../interfaces/video";
import { parseM3U } from "../Utils";
import { M3U, StreamItem } from "m3u8";
import { Language } from "../types/language";


class VilosSubtitleInfo implements SubtitleInfo {
    _sub: VilosVideoInfoConfigSubtitle;
    _isDefault: boolean;
    _requester: RequesterCdn;
    constructor(sub: VilosVideoInfoConfigSubtitle, isDefault: boolean, requester: RequesterCdn) {
        this._sub = sub;
        this._isDefault = isDefault;
        this._requester = requester;
    }
    async getTitle(): Promise<string> {
        return this._sub.title;
    }
    async getLanguage(): Promise<Language> {
        return this._sub.language;
    }
    async getLanguageISO6392T(): Promise<string> {
        return langs.where("1", this._sub.language.substring(0, 2))["2T"];
    }
    async getData(): Promise<string> {
        return (await this._requester.get(this._sub.url)).body.toString();
    }
    async isDefault(): Promise<boolean> {
        return this._isDefault;
    }
}

class StreamVilosPlayer implements StreamInfo {
    _stream: StreamItem;
    _hardsubLang: Language;
    _audioLang: Language;
    constructor(stream: StreamItem, hardsubLang: Language, audioLang: Language) {
        this._stream = stream;
        this._hardsubLang = hardsubLang;
        this._audioLang = audioLang;
    }
    getHardsubLanguage(): Language {
        return this._hardsubLang;
    }
    getAudioLanguage(): Language {
        return this._audioLang;
    }
    getWidth(): number {
        return this._stream.attributes.attributes.resolution?.[0] ?? 0;
    }
    getHeight(): number {
        return this._stream.attributes.attributes.resolution?.[1] ?? 0;
    }
    getUrl(): string {
        if (!this._stream.properties.uri) throw new RuntimeError("No URI for Stream found");
        return this._stream.properties.uri;
    }
}

interface VilosVideoInfoConfigSubtitle {
    language: Language;
    url: string;
    title: string;
    format: "ass";
}
interface VilosVideoInfoConfigStream {
    format: "adaptive_dash" | "adaptive_hls" | "drm_adaptive_dash" | "drm_multitrack_adaptive_hls_v2"
    | "multitrack_adaptive_hls_v2" | "vo_adaptive_dash" | "vo_adaptive_hls" | "vo_drm_adaptive_dash"
    | "vo_drm_adaptive_hls" | "trailer_hls" | "trailer_dash";
    audio_lang: Language;
    hardsub_lang: Language;
    url: string;
    resolution: string; // currently always "adaptive"

    data?: string;
}

interface VilosVideoInfoConfig {
    metadata: {
        id: string;
        series_id: string;
        type: string;
        channel_id: unknown;
        title: string;
        description: string;
        episode_number: string;
        display_episode_number: string;
        is_mature: boolean;
        up_next: {
            title: string;
            id: string;
            channel_id: unknown;
            channel_name: unknown;
            description: string;
            display_episode_number: string;
            duration: number;
            episode_number: string;
            episode_title: string;
            extra_title: unknown;
            is_mature: boolean;
            is_premium_only: boolean;
            media_title: string;
            release_date: string;
            season_title: string;
            series_id: string;
            series_title: string;
            type: string;
            thumbnail: {
                url: string;
                width: number;
                height: number;
            };
        };
        duration: number;
    };
    thumbnail: {
        url: string;
    };
    streams: VilosVideoInfoConfigStream[];
    ad_breaks: {
        type: string; // "preroll"/"midroll"
        offset: number;
    }[];
    subtitles: VilosVideoInfoConfigSubtitle[];
}

export class VilosVideoInfo implements VideoInfo {
    _html: string;
    _url: string;
    _language: Language;
    _config: VilosVideoInfoConfig;
    _requester: RequesterCdn;

    constructor(html: string, url: string, requester: RequesterCdn) {
        this._html = html;
        this._url = url;
        this._requester = requester;
        
        const fastfix = /<span id="sharing_add_queue_button" (.*?)>/gms;
        this._html = this._html.replace(fastfix, "");

        const matchConfig = this._html.match(/vilos\.config\.media = (.+);/);
        if (!matchConfig) throw new Error("Couldn't find video config on webpage.");
        this._config = JSON.parse(matchConfig[1]);

        const matchLanguage = this._html.match(/vilos\.config\.player\.language = ([^;]+);/);
        if (!matchLanguage) throw new Error("Couldn't find default language");
        this._language = JSON.parse(matchLanguage[1]);


    }
    async getSubtitles(): Promise<VilosSubtitleInfo[]> {
        const subtitles: VilosSubtitleInfo[] = [];
        for (let i = 0; i < this._config.subtitles.length; i++) {
            const isDefault = this._config.subtitles[i].language == this._language;
            subtitles.push(new VilosSubtitleInfo(this._config.subtitles[i], isDefault, this._requester));
        }
        return subtitles;
    }

    async getDefaultLanguage(): Promise<Language> {
        return this._language;
    }

    async _loadStreamData(stream: VilosVideoInfoConfigStream): Promise<string> {
        if (stream.data) return stream.data;
        return (await this._requester.get(stream.url)).body.toString();
    }
    async _getStreamForHardsubLang(hardSubLang: Language | null): Promise<VilosVideoInfoConfigStream | null> {
        for (const stream of this._config.streams) {
            if (stream.hardsub_lang == hardSubLang && stream.format == "adaptive_hls") {
                return stream;
            }
        }
        return null;
    }
    async getAvailableResolutions(hardSubLang: Language): Promise<number[]> {


        const selectedStream = await this._getStreamForHardsubLang(hardSubLang);
        if (!selectedStream) {
            throw new UserInputError("No stream found for hardsub language: " + hardSubLang);
        }
        if (!selectedStream.data) {
            selectedStream.data = await this._loadStreamData(selectedStream);
        }

        const availableResolutions: number[] = [];
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
    async getStreams(resolution: number, hardSubLang: Language | null): Promise<StreamVilosPlayer[]> {
        const selectedStream = await this._getStreamForHardsubLang(hardSubLang);
        if (!selectedStream) {
            throw new UserInputError("No stream found for hardsub language: " + hardSubLang);
        }
        if (!selectedStream.data) {
            selectedStream.data = await this._loadStreamData(selectedStream);
        }

        // selectedStream is a group of Streams in different resolutions. We need to filter out one resolution.
        const m3uData: M3U = await parseM3U(selectedStream.data);
        const streamList: StreamVilosPlayer[] = [];
        for (const streamItem of m3uData.items.StreamItem) {
            if (streamItem.attributes.attributes.resolution?.[1] == resolution) {
                streamList.push(new StreamVilosPlayer(streamItem, selectedStream.hardsub_lang, selectedStream.audio_lang));
            }
        }
        return streamList;

    }
    async getEpisodeTitle(): Promise<string> {
        return this._config.metadata.title;
    }
    async getSeriesTitle(): Promise<string> {
        const seriesTitleMatch = /"mediaTitle":(".*?[^\\]")/.exec(this._html);
        const seriesTitle: string = seriesTitleMatch ? JSON.parse(seriesTitleMatch[1]) : "undefined";
        return seriesTitle;
    }
    async getSeasonTitle(): Promise<string> {
        const seasonTitleMatch = /"seasonTitle":(".*?[^\\]")/.exec(this._html);
        const seasonTitle = seasonTitleMatch ? JSON.parse(seasonTitleMatch[1]) : "undefined";
        return seasonTitle;
    }
    async getEpisodeNumber(): Promise<string> {
        return this._config.metadata.episode_number;
    }
    async isRegionBlocked(): Promise<boolean> {
        return this._config.streams.length == 0;
    }
    async isPremiumBlocked(): Promise<boolean> {
        return this._html.includes("class=\"showmedia-trailer-notice\"");
    }
}
