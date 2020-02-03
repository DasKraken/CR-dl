const mkdirp = require('mkdirp');
const path = require('path');
const fs = require('fs');
const request = require("request");

const fontsRootUrl = "https://static.crunchyroll.com/vilos/assets/fonts/";

// List at view-source:https://static.crunchyroll.com/vilos/player.html
const fontFiles = {
    "Adobe Arabic": "AdobeArabic-Bold.otf",
    "Andale Mono": "andalemo.ttf",
    "Arial": "arial.ttf",
    "Arial Bold": "arialbd.ttf",
    "Arial Bold Italic": "arialbi.ttf",
    "Arial Italic": "ariali.ttf",
    "Arial Unicode MS": "arialuni.ttf",
    "Arial Black": "ariblk.ttf",
    "Comic Sans MS": "comic.ttf",
    "Comic Sans MS Bold": "comicbd.ttf",
    "Courier New": "cour.ttf",
    "Courier New Bold": "courbd.ttf",
    "Courier New Bold Italic": "courbi.ttf",
    "Courier New Italic": "couri.ttf",
    "DejaVu LGC Sans Mono Bold": "DejaVuLGCSansMono-Bold.ttf",
    "DejaVu LGC Sans Mono Bold Oblique": "DejaVuLGCSansMono-BoldOblique.ttf",
    "DejaVu LGC Sans Mono Oblique": "DejaVuLGCSansMono-Oblique.ttf",
    "DejaVu LGC Sans Mono": "DejaVuLGCSansMono.ttf",
    "DejaVu Sans Bold": "DejaVuSans-Bold.ttf",
    "DejaVu Sans Bold Oblique": "DejaVuSans-BoldOblique.ttf",
    "DejaVu Sans ExtraLight": "DejaVuSans-ExtraLight.ttf",
    "DejaVu Sans Oblique": "DejaVuSans-Oblique.ttf",
    "DejaVu Sans": "DejaVuSans.ttf",
    "DejaVu Sans Condensed Bold": "DejaVuSansCondensed-Bold.ttf",
    "DejaVu Sans Condensed Bold Oblique": "DejaVuSansCondensed-BoldOblique.ttf",
    "DejaVu Sans Condensed Oblique": "DejaVuSansCondensed-Oblique.ttf",
    "DejaVu Sans Condensed": "DejaVuSansCondensed.ttf",
    "DejaVu Sans Mono Bold": "DejaVuSansMono-Bold.ttf",
    "DejaVu Sans Mono Bold Oblique": "DejaVuSansMono-BoldOblique.ttf",
    "DejaVu Sans Mono Oblique": "DejaVuSansMono-Oblique.ttf",
    "DejaVu Sans Mono": "DejaVuSansMono.ttf",
    "Georgia": "georgia.ttf",
    "Georgia Bold": "georgiab.ttf",
    "Georgia Italic": "georgiai.ttf",
    "Georgia Bold Italic": "georgiaz.ttf",
    "Impact": "impact.ttf",
    "Rubik Black": "Rubik-Black.ttf",
    "Rubik Black Italic": "Rubik-BlackItalic.ttf",
    "Rubik Bold": "Rubik-Bold.ttf",
    "Rubik Bold Italic": "Rubik-BoldItalic.ttf",
    "Rubik Italic": "Rubik-Italic.ttf",
    "Rubik Light": "Rubik-Light.ttf",
    "Rubik Light Italic": "Rubik-LightItalic.ttf",
    "Rubik Medium": "Rubik-Medium.ttf",
    "Rubik Medium Italic": "Rubik-MediumItalic.ttf",
    "Rubik": "Rubik-Regular.ttf",
    "Tahoma": "tahoma.ttf",
    "Times New Roman": "times.ttf",
    "Times New Roman Bold": "timesbd.ttf",
    "Times New Roman Bold Italic": "timesbi.ttf",
    "Times New Roman Italic": "timesi.ttf",
    "Trebuchet MS": "trebuc.ttf",
    "Trebuchet MS Bold": "trebucbd.ttf",
    "Trebuchet MS Bold Italic": "trebucbi.ttf",
    "Trebuchet MS Italic": "trebucit.ttf",
    "Verdana": "verdana.ttf",
    "Verdana Bold": "verdanab.ttf",
    "Verdana Italic": "verdanai.ttf",
    "Verdana Bold Italic": "verdanaz.ttf",
    "Webdings": "webdings.ttf"
};

const availableFonts = {};
for (let f in fontFiles) {
    if (f && fontFiles.hasOwnProperty(f)) {
        (availableFonts[f.toLowerCase()] = fontsRootUrl + fontFiles[f]);
    }
}


async function downloadFile(uri, dest, options) {
    await new Promise((resolve, reject) => {
        request(uri, {
            forever: true,
            timeout: 20000,
            proxy: options.httpProxy
        }).on("error", (e) => {
            reject(new NetworkException(e.message));
        }).on("response", (response) => {
            if (response.statusCode != 200) {
                reject(new NetworkException("HTTP status code: " + (response.statusCode)));
            }
        }).pipe(fs.createWriteStream(dest)).on("finish", (resolve));
    });

}

exports.downloadFontsFromSubtitles = async (_httpClient, subtitles, options) => {

    const dir = path.join(options.tmpDir, "Fonts")
    mkdirp.sync(dir);

    const fontsToInclude = [];
    const fontsInSub = {};

    for (const subtitle of subtitles) {

        const subContent = fs.readFileSync(subtitle.path);

        // https://github.com/Dador/JavascriptSubtitlesOctopus/blob/master/src/pre-worker.js#L15
        const regex1 = /\nStyle: [^,]*?,([^,]*?),/ig;
        const regex2 = /\\fn([^\\}]*?)[\\}]/g;

        let matches;
        while ((matches = regex1.exec(subContent)) || (matches = regex2.exec(subContent))) {
            let font = matches[1].trim().toLowerCase();
            if (!(font in fontsInSub)) {
                fontsInSub[font] = true;
                if (font in availableFonts) {
                    const filePath = path.join(dir, availableFonts[font].split('/').pop());
                    await downloadFile(availableFonts[font], filePath, options);
                    fontsToInclude.push(filePath);
                } else {
                    console.log("Unknown font: " + font)
                }
            }
        }
    }
    return fontsToInclude
}
