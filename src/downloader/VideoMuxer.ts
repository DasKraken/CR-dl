import { RuntimeError } from "../Errors";
import { EventEmitter } from "events";
import { LocalSubtitle } from "../types/Subtitle";
import { spawn } from "child_process";
import * as readline from "readline";


function parseProgressLine(line: string): Record<string, string> | null {
    const progress: Record<string, string> = {};

    // Remove all spaces after = and trim
    line = line.replace(/=\s+/g, "=").trim();
    const progressParts = line.split(" ");

    // Split every progress part by "=" to get key and value
    for (let i = 0; i < progressParts.length; i++) {
        const progressSplit = progressParts[i].split("=", 2);
        const key = progressSplit[0];
        const value = progressSplit[1];

        // This is not a progress line
        if (typeof value === "undefined")
            return null;

        progress[key] = value;
    }

    return progress;
}

export interface VideoMuxerOptions {
    input: string;
    metadata?;
    subtitles: LocalSubtitle[];
    fonts: string[];
    output: string;
}
export declare interface VideoMuxer {
    on(name: "info", listener: (data: Buffer) => void): this;
    on(name: "total", listener: (totalMilliseconds: number, totalString: string) => void): this;
    on(name: "progress", listener: (progressMilliseconds: number, progressString: string, fps: number) => void): this;
    on(name: "end", listener: (code: number) => void): this;
}
export class VideoMuxer extends EventEmitter {
    input: string;
    subtitles: LocalSubtitle[];
    fonts: string[];
    output: string;

    constructor({
        input,
        subtitles,
        fonts,
        output
    }: VideoMuxerOptions) {
        super();
        this.input = input.replace(/\\/g, "/"); // ffmpeg cant handle backslash
        this.subtitles = subtitles;
        this.fonts = fonts.map((font) => font.replace(/\\/g, "/"));
        this.output = output;
    }
    run(): Promise<void> {
        return new Promise((resolve, reject) => {

            const command = this._makeCommand();

            //console.log(command)
            const proc = spawn("ffmpeg", command, {
                windowsHide: true
            });
            proc.stdout.on("data", function (data) {
                console.log("[ffmpeg]: " + data);
            });
            proc.stderr.setEncoding("utf8");

            const rl = readline.createInterface({
                input: proc.stderr
            });


            rl.on("line", (data: string) => {
                const dataString = data.toString();
                //console.log(util.inspect(dataString))
                this.emit("info", data);
                const match: RegExpExecArray | null = /Duration: ([0-9]{2}):([0-9]{2}):([0-9]{2}).([0-9]{2}),/.exec(dataString);
                if (match) {

                    const totalString = `${match[1]}:${match[2]}:${match[3]}.${match[4]}`;

                    // Video duration in milliseconds
                    const totalMilliseconds = parseInt(match[4]) * 10 + parseInt(match[3]) * 1000 + parseInt(match[2]) * 60000 + parseInt(match[1]) * 3600000;

                    //console.log("total", totalMilliseconds, totalString)
                    this.emit("total", totalMilliseconds, totalString);
                    return;
                }

                const progress = parseProgressLine(dataString);
                if (progress) {
                    const match = /([0-9]{2}):([0-9]{2}):([0-9]{2}).([0-9]{2})/.exec(progress.time);
                    if (match) {
                        const progressString = progress.time;

                        // Video progress in milliseconds
                        const progressMilliseconds = parseInt(match[4]) * 10 + parseInt(match[3]) * 1000 + parseInt(match[2]) * 60000 + parseInt(match[1]) * 3600000;
                        //console.log("progress", progressMilliseconds, progressString, parseInt(progress.fps))
                        this.emit("progress", progressMilliseconds, progressString, parseInt(progress.fps));
                    }
                }

            });

            proc.on("close", (code) => {
                this.emit("end", code);
                if (code == 0) {
                    resolve();
                } else {
                    reject(new RuntimeError(`ffmpeg process exited with code ${code}`));
                }
            });
            proc.on("error", function (err) {
                reject(new RuntimeError(err.message));
            });
        });
    }
    _makeCommand(): string[] {
        const command = ["-stats", "-allowed_extensions", "ALL", "-y", "-i", this.input];

        for (const subtitle of this.subtitles) {
            command.push("-i", subtitle.path);
        }


        command.push("-map", "0:v", "-map", "0:a");

        let i = 1;
        let s = 0;
        for (const subtitle of this.subtitles) {
            command.push("-map", i.toString());
            command.push("-metadata:s:s:" + s, "title=" + subtitle.title);
            command.push("-metadata:s:s:" + s, "language=" + subtitle.language);
            command.push("-disposition:s:" + s, subtitle.default ? "default" : "0");
            i++;
            s++;
        }

        let t = 0;
        for (const font of this.fonts) {
            const fileEnding = font.split(".").pop()?.trim().toLowerCase() ?? "unknown";
            let mimeType: string;

            // https://github.com/FFmpeg/FFmpeg/blob/master/libavformat/matroska.c#L131
            if (fileEnding == "ttf") {
                mimeType = "application/x-truetype-font";
            } else if (fileEnding == "otf") {
                mimeType = "application/vnd.ms-opentype";
            } else {
                console.log("unknown font format: " + fileEnding);
                break;
            }

            command.push("-attach", font);
            command.push("-metadata:s:t:" + t, "mimetype=" + mimeType);
            t++;
        }

        command.push("-c", "copy", this.output);
        return command;
    }
}