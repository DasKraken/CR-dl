import { Readable } from "stream";
export interface Requester {
    get: (url: string) => Promise<{
        body: Buffer;
        url: string;
    }>;
    post: (url: string, formdata?: Record<string, string>) => Promise<{}>;
}
export interface RequesterCdn {
    stream: (url: string) => Readable;
    get: (url: string) => Promise<{
        body: Buffer;
        url: string;
    }>;
}