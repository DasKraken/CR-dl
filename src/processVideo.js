const { spawn } = require('child_process');

module.exports = function processVideo(input, metadata, subtitles, output) {
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

        //console.log(command)
        let proc = spawn('ffmpeg', command);
        proc.stdout.on('data', function (data) {
            console.log('[ffmpeg]: ' + data);
        });

        proc.stderr.on('data', function (data) {
            if (!(/Opening .* for reading/.exec(data + ""))) { // Spam
                console.error('[ffmpeg-e]: ' + data);
            }
        });

        proc.on('close', (code) => {
            if (code !== 0) {
                console.log(`ffmpeg process exited with code ${code}`);
            }

            if (code == 0) {
                //added = true;
                //// downloadedIds.episodes[episodeId] = true;
                /// fs.writeFileSync("downloadedIds.json", JSON.stringify(downloadedIds));
                resolve();
            } else {
                reject();
            }
        });
        proc.on('error', function (err) { console.error(err) })
    });
}