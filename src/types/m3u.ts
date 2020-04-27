export interface AttributeList {
    attributes: {
        "audio"?: string;
        "autoselect"?: boolean;
        "bandwidth"?: number;
        "average-bandwidth"?: number;
        "frame-rate"?: number;
        "byterange"?: string;
        "channels"?: string;
        "codecs"?: string;
        "default"?: boolean;
        "duration"?: number;
        "forced"?: boolean;
        "group-id"?: string;
        "language"?: string;
        "name"?: string;
        "program-id"?: number;
        "resolution"?: [number, number];
        "subtitles"?: string;
        "title"?: string;
        "type"?: string;
        "uri"?: string;
        "video"?: string;
    };
    get<K extends keyof AttributeList["attributes"]>(key: K): AttributeList["attributes"][K];
    getCoerced<K extends keyof AttributeList["attributes"]>(key: K): string;
    set<K extends keyof AttributeList["attributes"]>(key: K, value: string): void;
}
export interface Item {
    attributes: AttributeList;
    properties: {
        byteRange: null | string;
        daiPlacementOpportunity: null | string;
        date: null | Date;
        discontinuity: null | boolean;
        duration: null | number;
        title: null | string;
        uri: null | string;
    };
    get<K extends keyof Item["properties"]>(key: K): Item["properties"][K];
    get<K extends keyof AttributeList["attributes"]>(key: K): AttributeList["attributes"][K];

    set<K extends keyof Item["properties"]>(key: K, value: Item["properties"][K]): void;
    set<K extends keyof AttributeList["attributes"]>(key: K, value: string): void;
}

export type PlaylistItem = Item
export type StreamItem = Item
export type IframeStreamItem = Item
export type MediaItem = Item

export interface M3U {
    items: {
        PlaylistItem: PlaylistItem[];
        StreamItem: StreamItem[];
        IframeStreamItem: IframeStreamItem[];
        MediaItem: MediaItem[];
    };
    properties: {
        playlistType: "VOD";

    };
}