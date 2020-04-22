#!/usr/bin/env node
import { Command } from "commander";
import * as read from "read";
import { loadCookies, getRequester, saveCookies, getRequesterCdn } from "./common";
import { CrDl } from "../api/CrDl";
import { UserInputError, RuntimeError } from "../Errors";
import { languages, Language } from "../types/language";
import { makeid, pad, toFilename, formatScene } from "../Utils";
import * as util from "util";
import * as fs from "fs";
import * as path from "path";
import { SubtitleInfo, StreamInfo } from "../interfaces/video";
import { downloadFontsFromSubtitles } from "../downloader/FontDownloader";
import { Requester, RequesterCdn } from "../types/Requester";
import * as format_ from 'string-format';
import { M3uDownloader } from "../downloader/M3uDownloader";
import { ListDownloader, DownloadUpdateOptions } from "../downloader/ListDownloader";
import { VideoMuxer } from "../downloader/VideoMuxer";
import * as cliProgress from "cli-progress";
import * as prettyBytes from "pretty-bytes";
const format = format_.create({
  scene: formatScene
})
export const download = new Command();

interface Options {
  proxy?: string;
  proxyCdn?: string;
  format: string;
  connections: number;
  listSubs: boolean;
  defaultSub?: Language | "none";
  subLang?: (Language | "none")[];
  hardsub: boolean;
  attachFonts: boolean;
  subsOnly: boolean;
  output?: string;
  retry: number;
}

let requester: Requester;
let requesterCdn: RequesterCdn;

download
  .name("download").alias("dl")
  .description("Download video or series from URL")
  .arguments("<URL>")
  .option("--proxy <url>", "HTTP proxy used to access Crunchyroll.")
  .option("--proxy-cdn <url>", "HTTP proxy used to download video files. Not required for bypassing geo-blocking.")
  .option("-f, --format <resolution>", "Video resolution", "1080p")
  .option("-c, --connections <connections>", "Number of simultaneous connections", "5")
  .option("--list-subs", "Don't download. List all available subtitles for the video")
  .option("--hardsub", "Download hardsubbed video stream. Only one subtitle specified by --subDefault will be included")
  .option("--default-sub LANG", "Specify subtitle language to set as default. (eg. deDE) (Default: if --subLangs defined: first entry, otherwise: crunchyroll default)")
  .option("--sub-lang LANGS", "Specify subtitle languages as a comma separated list to include in video (eg. deDE,enUS). Use --list-subs for available language tags. (Default: All available)")
  .option("--attach-fonts", "Attach all fonts that are used in subtitles.")
  .option("--subs-only", "Download only subtitles. No Video.")
  .option("-o, --output <template>", "Output filename template, see the \"OUTPUT TEMPLATE\" in README for all the info.")
  .option("--retry <N>", "Max number of download attempts before aborting.", "5")
  .action(async function (url: string, cmdObj) {

    console.log(cmdObj);

    const options: Options = {
      proxy: cmdObj.proxy,
      proxyCdn: cmdObj.proxyCdn,
      format: cmdObj.format,
      connections: parseInt(cmdObj.connections),
      listSubs: !!cmdObj.listSubs,
      defaultSub: cmdObj.defaultSub,
      subLang: cmdObj.subLang ? cmdObj.subLang.split(",") : undefined,
      hardsub: !!cmdObj.hardsub,
      attachFonts: !!cmdObj.attachFonts,
      subsOnly: !!cmdObj.subsOnly,
      output: cmdObj.output,
      retry: parseInt(cmdObj.retry)
    };

    if (isNaN(options.connections)) {
      console.log("--connections must be a number");
      return;
    }
    if (isNaN(options.retry)) {
      console.log("--retry must be a number");
      return;
    }

    if (options.defaultSub && options.defaultSub !== "none" && !languages.includes(options.defaultSub)) {
      console.log("--default-sub: Unknown language. Must be one of: none, " + languages.join(", "));
      return;
    }

    if (options.subLang) {
      for (const lang of options.subLang) {
        if (lang !== "none" && !languages.includes(lang)) {
          console.log("--sub-lang: Unknown language " + util.inspect(lang) + ". Must be one of: none, " + languages.join(", "));
          return;
        }
      }
    }



    loadCookies();
    requester = getRequester(options);
    requesterCdn = getRequesterCdn(options);
    const crDl = new CrDl({ requester: requester, requesterCdn: requesterCdn });
    console.log(cmdObj)

    try {
      if (/www\.crunchyroll\.com\/([a-z-]{1,5}\/)?[^/]+\/[^/]+-[0-9]+$/.exec(url)) {
        await downloadVideo(url, crDl, options);
      } else if (/www\.crunchyroll\.com\/([a-z-]{1,5}\/)?[^/]+\/?$/.exec(url)) {
        await downloadSeries(url, crDl, options);
      } else {
        console.log(`Error: Unsupported URL`);
      }
    } catch (error) {
      if (error instanceof UserInputError) {
        console.log(error.message) // Dont print stacktrace
      } else {
        console.log(error)
      }
    }

    saveCookies();

  });



async function downloadVideo(url: string, crDl: CrDl, options: Options) {
  const tmpDir = "tmp_" + makeid(6) + "/";

  const media = await crDl.loadEpisode(url);
  const subtitles = await media.getSubtitles();

  if (options.listSubs) {
    // List subs. Do not download.
    const subsTable: { title: string, langCode: string, isDefault: boolean }[] = [];
    for (const sub of subtitles) {
      subsTable.push({ title: await sub.getTitle(), langCode: await sub.getLanguage(), isDefault: await sub.isDefault() });
    }
    console.table(subsTable);
    return;
  }

  // Ensure options
  if (!options.defaultSub) {
    if (options.subLang && options.subLang.length > 0) {
      options.defaultSub = options.subLang[0];
    } else if (subtitles.length == 0) {
      options.defaultSub = "none";
    } else {
      options.defaultSub = await media.getDefaultLanguage();
    }
  }
  if (!options.subLang) {
    if (options.hardsub) {
      options.subLang = [options.defaultSub];
    } else {
      options.subLang = [];
      for (const sub of subtitles) {
        options.subLang.push(await sub.getLanguage());
      }
    }

  }

  // select and download Subs
  let hardsubLang: Language | null = null;
  let subsToInclude: SubToInclude[];
  if (options.hardsub && options.defaultSub !== "none") {
    if (options.subLang.length > 1) throw new UserInputError("Cannot embed multiple subtitles with --hardsub");
    hardsubLang = options.defaultSub;
    subsToInclude = [];

    console.log(`Selected "${hardsubLang}" as hardsub language.`)
  } else {
    hardsubLang = null;
    subsToInclude = await downloadSubs(subtitles, path.join(tmpDir, "SubData"), options.subLang, options.defaultSub);

  }
  if (subsToInclude.length > 0) {
    console.log("Following subtitles will be included: ")
    console.table(subsToInclude, ["title", "langCode", "default"]);
  } else {
    console.log("No subtitles will be included.")
  }

  // download fonts
  let fontsToInclude: string[] = [];
  if (options.attachFonts) {
    fontsToInclude = await downloadFontsFromSubtitles(requesterCdn, options.retry, subsToInclude, path.join(tmpDir, "Fonts"));
  }

  //console.log(fontsToInclude);

  let selectedStream: StreamInfo | undefined = undefined;
  if (!options.subsOnly) {
    let resolution = getMaxWantedResolution(await media.getAvailableResolutions(hardsubLang), options.format);

    // We may get multiple streams on different servers. Just take first.
    selectedStream = (await media.getStreams(resolution, hardsubLang))[0];
  }


  const metadata = {
    episodeTitle: await media.getEpisodeTitle(),
    seriesTitle: await media.getSeriesTitle(),
    episodeNumber: await media.getEpisodeNumber(),
    seasonTitle: await media.getSeasonTitle(),
    resolution: options.subsOnly ? "subtitles" : selectedStream?.getHeight() + "p",
  }

  if (!isNaN(parseInt(metadata.episodeNumber))) {
    metadata.episodeNumber = pad(metadata.episodeNumber, 2)
  }

  const formatData = {};
  for (const prop in metadata) {
    formatData[prop] = toFilename(metadata[prop]);
  }

  if (!options.output) {
    if (options.subsOnly) {
      options.output = "{seasonTitle} [subtitles]/{seasonTitle} - {episodeNumber} - {episodeTitle}.ass";
    } else {
      options.output = "{seasonTitle} [{resolution}]/{seasonTitle} - {episodeNumber} - {episodeTitle} [{resolution}].mkv";
    }
  }
  const outputPath = format(options.output, formatData)

  console.log(`Downloading to "${outputPath}"...`);

  const outputDirectory = outputPath.substring(0, outputPath.lastIndexOf("/"));
  if (outputDirectory.length > 0) {
    await fs.promises.mkdir(outputDirectory, { recursive: true });
  }
  if (options.subsOnly) {
    await downloadSubsOnly(subsToInclude, outputPath);
  } else {
    //const m3u8File = await downloadVideoFromM3U(selectedStream.getUrl(), "VodVid", options)
    if (!selectedStream) throw new RuntimeError("No stream selcted. Should never happen.");
    await fs.promises.mkdir(path.join(tmpDir, "VodVid"), { recursive: true });

    // === M3u8 File ===
    const m3u8File = new M3uDownloader();
    const m3u8FilePath = path.join(tmpDir, "VodVid.m3u8");
    await m3u8File.load(selectedStream.getUrl(), tmpDir, "VodVid", requesterCdn)
    await fs.promises.writeFile(m3u8FilePath, m3u8File.getModifiedM3u());

    // === Key File ===
    const keyFile = m3u8File.getKeyFile();
    if (keyFile) {

      await ListDownloader.safeDownload(keyFile.url, keyFile.destination, 5, requesterCdn);
    }

    // === Video Files Download ===
    const listDownloader = new ListDownloader(m3u8File.getVideoFiles(), options.retry, options.connections, requesterCdn);
    const bar1 = new cliProgress.Bar({
      format: 'downloading [{bar}] {percentage}% | {downSize}/{estSize} | Speed: {speed}/s | ETA: {myEta}s'
    }, cliProgress.Presets.shades_classic);
    bar1.start(1, 0);
    listDownloader.on("update", (data: DownloadUpdateOptions) => {
      bar1.setTotal(data.estimatedSize);
      bar1.update(data.downloadedSize, {
        downSize: prettyBytes(data.downloadedSize),
        estSize: prettyBytes(data.estimatedSize),
        speed: prettyBytes(data.speed),
        myEta: Math.floor((data.estimatedSize - data.downloadedSize) / data.speed)
      });
    })
    //await listDownloader.startDownload();
    bar1.stop();

    // === Video Muxing ===
    const videoMuxer = new VideoMuxer({ input: m3u8FilePath, subtitles: subsToInclude, fonts: fontsToInclude, output: outputPath });
    let totalDuration = "";
    const bar2 = new cliProgress.Bar({
      format: 'muxing [{bar}] {percentage}% | {curDuration}/{totalDuration} | Speed: {fps} fps'
    }, cliProgress.Presets.shades_classic);
    bar2.start(1, 0);
    videoMuxer.on("total", (totalMilliseconds: number, totalString: string) => {
      bar2.setTotal(totalMilliseconds);
      totalDuration = totalString;
    });
    videoMuxer.on("progress", (progressMilliseconds: number, progressString: string, fps: number) => {
      bar2.update(progressMilliseconds, {
        curDuration: progressString,
        totalDuration: totalDuration,
        fps
      })
    });
    await videoMuxer.run();
    bar2.stop();
  }


}

async function downloadSubsOnly(subtitlesToInclude: SubToInclude[], outputPath: string) {
  if (outputPath.lastIndexOf("/") < outputPath.lastIndexOf(".")) {
    outputPath = outputPath.substr(0, outputPath.lastIndexOf("."));
  }
  for (const sub of subtitlesToInclude) {
    await fs.promises.rename(sub.path, `${outputPath}.${sub.langCode}.ass`);
  }
}

async function downloadSeries(url: String, crDl: CrDl, options: Options) {

}



async function getSubtitleByLanguage(subtitles: SubtitleInfo[], language: Language): Promise<SubtitleInfo | undefined> {
  let sub: SubtitleInfo | undefined = undefined;
  for (const subt of subtitles) {
    if (await subt.getLanguage() == language) {
      sub = subt;
      break;
    }
  };
  return sub;
}
interface SubToInclude {
  title: string;
  path: string;
  language: string;
  langCode: Language;
  default: boolean;
}
async function downloadSubs(subtitles: SubtitleInfo[], destination: string, langs: (Language | "none")[], defaultSub: Language | "none"): Promise<SubToInclude[]> {
  let subsToInclude: SubToInclude[] = [];
  await fs.promises.mkdir(destination, { recursive: true });
  for (const lang of langs) {
    if (lang == "none") continue;

    const sub = await getSubtitleByLanguage(subtitles, lang);
    if (!sub) {
      console.error("Subtitles for " + lang + " not available. Skipping...");
    } else {
      const filePath = path.join(destination, await sub.getLanguage() + ".ass");
      fs.promises.writeFile(filePath, await sub.getData());
      subsToInclude.push({
        title: await sub.getTitle(),
        path: filePath,
        language: await sub.getLanguageISO6392T(),
        langCode: await sub.getLanguage(),
        default: false
      });
    }
  }

  if (defaultSub != "none") {
    let defaultSet = false;
    for (const sub of subsToInclude) {
      if (sub.langCode == defaultSub) {
        sub.default = true;
        defaultSet = true;
      } else {
        sub.default = false;
      }
    }
    if (!defaultSet) {
      throw new UserInputError("Couldn't set " + defaultSub + " as default subtitle: subtitle not available.")
    }
  }

  return subsToInclude;
}

function getMaxWantedResolution(availableResolutions: number[], res: number | string): number {
  if (typeof res == "string" && res.endsWith("p")) {
    res = res.substr(0, res.length - 1);
  }
  res = parseInt(res as string);
  if (isNaN(res)) throw new UserInputError("Invalid resolution.");

  if (availableResolutions.indexOf(res) > -1) {
    return res;
  }
  availableResolutions = availableResolutions.sort((a, b) => a - b)
  console.log(availableResolutions)
  for (let i = availableResolutions.length - 1; i >= 0; i--) {
    if (availableResolutions[i] <= res) {
      console.log(`Resolution ${res}p not available. Using ${availableResolutions[i]}p instead.`)
      return availableResolutions[i];
    }
  }
  throw new RuntimeError(`No resolutions found.`);

}