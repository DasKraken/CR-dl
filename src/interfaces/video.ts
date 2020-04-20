export interface VideoInfo {
    getSubtitles(): Promise<SubtitleInfo[]>;
    getDefaultLanguage(): Promise<string>;
    getAvailableResolutions(hardSubLang: string);
    getStreams(resolution, hardSubLang): Promise<StreamInfo[]>;
    getEpisodeTitle(): Promise<string>;
    getSeriesTitle(): Promise<string>;
    getSeasonTitle(): Promise<string>;
    getEpisodeNumber(): Promise<string>;
}

export interface SubtitleInfo {
    getTitle(): Promise<string>;
    getLanguage(): Promise<string>;
    getLanguageISO6392T(): Promise<string>;
    getData(): Promise<string>;
    isDefault(): Promise<boolean>;
}
export interface StreamInfo {
    getHardsubLanguage(): string;
    getAudioLanguage(): string;
    getWidth(): number;
    getHeight(): number;
    getUrl(): string;
}