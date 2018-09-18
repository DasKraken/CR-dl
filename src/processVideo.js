const { spawn } = require('child_process');
const { RuntimeException } = require("./Exceptions");
const _cliProgress = require('cli-progress');

module.exports = function processVideo(input, metadata, subtitles, output, options) {
    return new Promise((resolve, reject) => {

        let command = ["-allowed_extensions", "ALL", "-y", "-i", input];

        for (const subtitle of subtitles) {
            command.push("-i", subtitle.path)
        }


        command.push("-map", "0:v", "-map", "0:a")

        let i = 1;
        let s = 0;
        for (const subtitle of subtitles) {
            command.push("-map", i)
            command.push("-metadata:s:s:" + s, "title=" + subtitle.title)
            command.push("-metadata:s:s:" + s, "language=" + subtitle.language)
            command.push("-disposition:s:" + s, subtitle.default ? "default" : "0")
            i++;
            s++;
        }

        command.push("-c", "copy", output)
        let bar1;
        if (options.showProgressBar) {
            bar1 = new _cliProgress.Bar({
                format: 'muxing [{bar}] {percentage}% | {curDuration}/{totalDuration} | Speed: {fps} fps'
            }, _cliProgress.Presets.shades_classic);
            bar1.start(1, 0);

        } else {
            console.log("Muxing...")
        }

        //console.log(command)
        let proc = spawn('ffmpeg', command);
        proc.stdout.on('data', function (data) {
            console.log('[ffmpeg]: ' + data);
        });

        let totalDuration = "";

        proc.stderr.on('data', function (data) {
            const dataString = data + ""
            if (options.showProgressBar) {

                let match;
                if (match = /Duration: ([0-9]{2}):([0-9]{2}):([0-9]{2}).([0-9]{2}),/.exec(dataString)) {
                    totalDuration = `${match[1]}:${match[2]}:${match[3]}.${match[4]}`
                    let totalTime = match[4] * 10 + match[3] * 1000 + match[2] * 60000 + match[1] * 3600000
                    bar1.setTotal(totalTime);
                } else if (match = /fps=([0-9.]+).*time=([0-9]{2}):([0-9]{2}):([0-9]{2}).([0-9]{2})/.exec(dataString)) {
                    let curDuration = `${match[2]}:${match[3]}:${match[4]}.${match[5]}`
                    let curTime = match[5] * 10 + match[4] * 1000 + match[3] * 60000 + match[2] * 3600000
                    let fps = match[1];
                    bar1.update(curTime, {
                        curDuration,
                        totalDuration,
                        fps
                    })
                }
            } else if (!(/Opening .* for reading/.exec(dataString))) { // Spam
                console.log('[ffmpeg-e]: ' + ("" + data).trim());
            }
        });

        proc.on('close', (code) => {
            if (bar1) {
                bar1.stop();
            }
            if (code == 0) {
                //added = true;
                //// downloadedIds.episodes[episodeId] = true;
                /// fs.writeFileSync("downloadedIds.json", JSON.stringify(downloadedIds));
                resolve();
            } else {
                reject(new RuntimeException(`ffmpeg process exited with code ${code}`));
            }
        });
        proc.on('error', function (err) {
            throw new RuntimeException(err)
        })
    });
}