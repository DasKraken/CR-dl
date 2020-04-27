import { Readable } from "stream";
import { Response } from "got/dist/source";
export interface Requester {
    get: (url: string) => Promise<{
        body: Buffer;
        url: string;
    }>;
    post: (url: string, formdata?: Record<string, string>) => Promise<{}>;
}

export interface OnResponse {
    on(name: "response", listener: (response: Response) => void): void;
}

export interface RequesterCdn {
    stream: (url: string) => Readable & OnResponse;
    get: (url: string) => Promise<{
        body: Buffer;
        url: string;
    }>;
}
