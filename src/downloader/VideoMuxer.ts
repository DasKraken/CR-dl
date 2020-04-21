import {
    UserInputError,
    RuntimeError,
    NetworkError
} from "../Errors";
import { EventEmitter } from "events";
import { LocalSubtitle } from "../types/Subtitle";
import { spawn } from 'child_process';


interface VideoMuxerOptions {
    input: string,
    metadata?,
    subtitles: LocalSubtitle[],
    fonts: string[],
    output: string
}

export default class VideoMuxer extends EventEmitter {
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
            const proc = spawn('ffmpeg', command);
            proc.stdout.on('data', function (data) {
                console.log('[ffmpeg]: ' + data);
            });


            proc.stderr.on('data', function (data: Buffer) {
                const dataString = data.toString();
                this.emit("info", data);



                let match;
                if (match = /Duration: ([0-9]{2}):([0-9]{2}):([0-9]{2}).([0-9]{2}),/.exec(dataString)) {

                    const totalString = `${match[1]}:${match[2]}:${match[3]}.${match[4]}`

                    // Video duration in milliseconds
                    const totalMilliseconds = match[4] * 10 + match[3] * 1000 + match[2] * 60000 + match[1] * 3600000

                    this.emit("total", totalMilliseconds, totalString);
                } else if (match = /fps=([0-9.]+).*time=([0-9]{2}):([0-9]{2}):([0-9]{2}).([0-9]{2})/.exec(dataString)) {

                    const progressString = `${match[2]}:${match[3]}:${match[4]}.${match[5]}`

                    // Video progress in milliseconds
                    const progressMilliseconds = match[5] * 10 + match[4] * 1000 + match[3] * 60000 + match[2] * 3600000
                    const fps = match[1];

                    this.emit("progress", progressMilliseconds, progressString, fps);
                }

            });

            proc.on('close', (code) => {
                this.emit("end", code);
                if (code == 0) {
                    resolve();
                } else {
                    reject(new RuntimeError(`ffmpeg process exited with code ${code}`));
                }
            });
            proc.on('error', function (err) {
                reject(new RuntimeError(err.message));
            })
        });
    }
    _makeCommand() {
        const command = ["-allowed_extensions", "ALL", "-y", "-i", this.input];

        for (const subtitle of this.subtitles) {
            command.push("-i", subtitle.path)
        }


        command.push("-map", "0:v", "-map", "0:a")

        let i = 1;
        let s = 0;
        for (const subtitle of this.subtitles) {
            command.push("-map", i.toString())
            command.push("-metadata:s:s:" + s, "title=" + subtitle.title)
            command.push("-metadata:s:s:" + s, "language=" + subtitle.language)
            command.push("-disposition:s:" + s, subtitle.default ? "default" : "0")
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
                console.log("unknown font format: " + fileEnding)
                break;
            }

            command.push("-attach", font);
            command.push("-metadata:s:t:" + t, "mimetype=" + mimeType);
            t++;
        }

        command.push("-c", "copy", this.output)
        return command;
    }
}