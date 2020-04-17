import got from "got";
import { Readable } from "stream";


export default function () {
    return {
        stream: (url: string): Readable => {
            return got.stream(url);
        }
    }

}