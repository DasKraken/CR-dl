import { Language } from "../types/language";

export interface VideoInfo {
    getSubtitles(): Promise<SubtitleInfo[]>;
    getDefaultLanguage(): Promise<Language>;
    getAvailableResolutions(hardSubLang: Language | null): Promise<number[]>;
    getStreams(resolution: number, hardSubLang: Language | null): Promise<StreamInfo[]>;
    getEpisodeTitle(): Promise<string>;
    getSeriesTitle(): Promise<string>;
    getSeasonTitle(): Promise<string>;
    getEpisodeNumber(): Promise<string>;
}

export interface SubtitleInfo {
    getTitle(): Promise<string>;
    getLanguage(): Promise<Language>;
    getLanguageISO6392T(): Promise<string>;
    getData(): Promise<string>;
    isDefault(): Promise<boolean>;
}
export interface StreamInfo {
    getHardsubLanguage(): Language;
    getAudioLanguage(): Language;
    getWidth(): number;
    getHeight(): number;
    getUrl(): string;
}
