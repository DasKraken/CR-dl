declare module "m3u8" {
    import { Stream } from "stream";
    namespace M3uParser {
        interface AttributeList {
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
        interface Item {
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

        type PlaylistItem = Item
        type StreamItem = Item
        type IframeStreamItem = Item
        type MediaItem = Item



        interface PropertiesOptions {
            allowCache: string;
            iframesOnly: boolean;
            independentSegmentsindependentSegments: boolean;
            mediaSequence: number;
            playlistType: "EVENT" | "VOD";
            targetDuration: number;
            version: number;
        }

        type Properties = Record<string, string> & PropertiesOptions;

        interface M3U {
            items: {
                PlaylistItem: PlaylistItem[];
                StreamItem: StreamItem[];
                IframeStreamItem: IframeStreamItem[];
                MediaItem: MediaItem[];
            };
            properties: Properties;

            get<K extends keyof Properties>(key: K): Properties[K];
            set<K extends keyof Properties>(key: K, value: string): void;
            //...
        }
    }
    class M3uParser extends Stream {
        static createStream(): M3uParser;
        on(name: "m3u", listener: (m3u: M3uParser.M3U) => void): this;
        on(name: "error", listener: (m3u: Error) => void): this;
        write(chunk: string | Buffer): true;
        end(): void;
    }

    export = M3uParser;

}