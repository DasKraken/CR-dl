#!/usr/bin/env node

const CrDl = require("./src/CrDl");
const {
  spawn
} = require('child_process');
const {
  UserInputException,
  CloudflareException
} = require("./src/Exceptions");


function verifyFfmpeg() {
  return new Promise((resolve, reject) => {
    var proc = spawn('ffmpeg');
    proc.on('error', function (err) {
      reject()
    })
    proc.on('close', function (err) {
      resolve()
    })
  });
}

const run = async () => {
  try {
    await verifyFfmpeg();
  } catch (e) {
    console.error("Error: ffmpeg needs to be installed");
    return;
  }

  const ArgumentParser = require("argparse").ArgumentParser;
  const parser = new ArgumentParser({
    version: "3.0.5",
    addHelp: true,
    description: "Crunchyroll downloader",
  });

  const subparsers = parser.addSubparsers({
    title: "Sub commands",
    dest: "subcommand_name"
  });

  const loginC = subparsers.addParser("login", {
    addHelp: true,
    description: "Login into CR. Cookies are stores in 'cookies.data'."
  });
  loginC.addArgument(
    ["username"], {
      action: "store",
      type: "string",
      help: "Username on CR",
    }
  );
  loginC.addArgument(
    ["password"], {
      action: "store",
      type: "string",
      help: "Password on CR",
    }
  );
  const lang = subparsers.addParser("language", {
    aliases: ["lang"],
    addHelp: true,
    description: "Set the language of CR and metadata. (Note 1: It doesn't change default subtitle language. Note 2: Videos that aren't available in selected language may not work). Available options are: enUS, enGB, esLA, esES, ptBR, ptPT, frFR, deDE, arME, itIT, ruRU"
  });
  lang.addArgument(
    ["lang"], {
      action: "store",
      type: "string",
      help: "Language to use",
    }
  );
  const logout = subparsers.addParser("logout", {
    addHelp: true,
    description: "Logs out of CR."
  });
  const download = subparsers.addParser("download", {
    aliases: ["dl"],
    addHelp: true,
    description: "Downloads video or series form URL."
  });
  download.addArgument(
    ["-c", "--connections"], {
      action: "store",
      type: "int",
      help: "Number of simultaneous connections (default: 5)",
      defaultValue: 5,
      metavar: "N"
    }
  );
  download.addArgument(
    ["url"], {
      action: "store",
      type: "string",
      help: "url of video or series"
    }
  );

  download.addArgument(
    ["resolution"], {
      action: "store",
      type: "string",
      help: "desired resolution (default: 1080p)",
      defaultValue: "1080p",
      nargs: '?'
    }
  );
  download.addArgument(
    ["--season", "--seasons"], {
      action: "store",
      type: "string",
      help: "A season number or a comma-separated list (without spaces) of season numbers can be provided to select which should be downloaded (eg. 1,2). Works only for series-links. Note: Season 1 is the bottom-most season on the website.",
      metavar: "SEASONS"
    }
  );
  download.addArgument(
    ["--episode", "--episodes"], {
      action: "store",
      type: "string",
      help: "A comma-separated list of episode numbers to download. A ```-``` can be used to specify an area (eg. ```01,03-05,SP2```). Works only for series-links. If multiple seasons are available, you must specify one with --season.",
      metavar: "EPISODES"
    }
  );
  download.addArgument(
    ["--subLangs"], {
      action: "store",
      type: "string",
      help: "Specify subtitle languages as a comma separated list to include in video. (eg. deDE,enUS)",
      metavar: "LANGS"
    }
  );
  download.addArgument(
    ["-l", "--subDefault"], {
      action: "store",
      type: "string",
      help: "Specify subtitle language to set as default. (eg. deDE) (Default: if --subLangs defined: first entry, otherwise: crunchyroll default)",
      metavar: "LANG"
    }
  );
  download.addArgument(
    ["--listSubs"], {
      action: "storeTrue",
      help: "Don't download. Show list of available subtitle languages.",
    }
  );
  download.addArgument(
    ["--maxAttempts"], {
      action: "store",
      type: "int",
      help: "Max number of download attempts before aborting. (Default: 5)",
      metavar: "N"
    }
  );
  download.addArgument(
    ["--hideProgressBar"], {
      action: "storeTrue",
      help: "Hide progress bar.",
    }
  );
  download.addArgument(
    ["-o", "--output"], {
      action: "store",
      type: "string",
      help: "Output filename template, see the \"OUTPUT TEMPLATE\" for all the info "
    }
  );
  download.addArgument(
    ["--hardsub"], {
      action: "storeTrue",
      help: "Download hardsubbed video stream. Only one subtitle specified by --subDefault will be included."
    }
  );
  download.addArgument(
    ["--subsOnly"], {
      action: "storeTrue",
      help: "Download only subtitles. No Video."
    }
  );
  const args = parser.parseArgs();

  args.showProgressBar = !args.hideProgressBar;
  args.tmpDir = "tmp/";

  if (args.subcommand_name == "login") {
    await CrDl.login(args.username, args.password);

  } else if (args.subcommand_name == "logout") {
    await CrDl.logout();

  } else if (args.subcommand_name == "download" || args.subcommand_name == "dl") {
    if (/www\.crunchyroll\.com\/([a-z-]{1,5}\/)?[^/]+\/[^/]+-[0-9]+$/.exec(args.url)) {
      await CrDl.downloadVideoUrl(args.url, args.resolution, args);
    } else if (/www\.crunchyroll\.com\/([a-z-]{1,5}\/)?[^/]+\/?$/.exec(args.url)) {
      await CrDl.downloadPlaylistUrl(args.url, args.resolution, args);
    } else {
      console.log(`Error: Unsupported URL`);
    }
  } else if (args.subcommand_name == "language" || args.subcommand_name == "lang") {
    const possibleSubValues = ["enUS", "enGB", "esLA", "esES", "ptBR", "ptPT", "frFR", "deDE", "arME", "itIT", "ruRU",]
    if (possibleSubValues.indexOf(args.lang) > -1) {
      await CrDl.setLang(args.lang);
    } else {
      console.log(`Unsupported language ${args.lang}. Supported languages are: ${possibleSubValues.join(", ")}`);
    }

  } else {
    console.error("unknown command: " + args.subcommand_name)
  }
}
run(process.argv)
  .then(() => {
    CrDl.cleanUp();
  }, (err) => {
    if (err instanceof UserInputException) {
      console.log("Error: " + err.message);
    } else if (err instanceof CloudflareException) {
      console.log("Couldn't bypass Cloudflare protection: " + err.message)
    } else {
      console.log(err)
    }
    CrDl.cleanUp();
  });