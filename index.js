const CrDl = require("./src/CrDl");
const {
  spawn
} = require('child_process');

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
    version: "1.1.0",
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
  const logout = subparsers.addParser("logout", {
    addHelp: true,
    description: "Logs out of CR."
  });
  const download = subparsers.addParser("download", {
    aliases: ["dl"],
    addHelp: true,
    description: "Downloads video or playlist form URL."
  });
  download.addArgument(
    ["-c", "--connections"], {
      action: "store",
      type: "int",
      help: "Number of simultaneous connections (default: 20)",
      defaultValue: 20,
      metavar: "N"
    }
  );
  download.addArgument(
    ["url"], {
      action: "store",
      type: "string",
      help: "url of video or playlist"
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
    ["seasonNumber"], {
      action: "store",
      type: "string",
      help: "Download only specified season. Only for playlist-links.",
      nargs: '?'
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
  const args = parser.parseArgs();

  args.showProgressBar = !args.hideProgressBar;
  if (args.subcommand_name == "login") {
    await CrDl.login(args.username, args.password);

  } else if (args.subcommand_name == "logout") {
    await CrDl.logout();

  } else if (args.subcommand_name == "download" || args.subcommand_name == "dl") {
    if (/www\.crunchyroll\.com\/[^/]+\/[^/]+-[0-9]+/.exec(args.url)) {
      await CrDl.downloadVideoUrl(args.url, args.resolution, args);
    } else {
      await CrDl.downloadPlaylistUrl(args.url, args.resolution, args.seasonNumber, args);
    }
  } else {
    console.error("unknown command: " + command)
  }
}
run(process.argv)
  .then(() => {
    console.log("Cleanup..");
    CrDl.cleanUp();
  }, (err) => {
    console.error(err)
    console.log("Cleanup..");
    CrDl.cleanUp();
  });