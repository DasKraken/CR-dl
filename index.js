const CrDl = require("./src/CrDl");

const run = async () => {

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

  const loginC = subparsers.addParser("login", { addHelp: true, description: "Login into CR. Cookies are stores in 'cookies.data'." });
  loginC.addArgument(
    ["username"],
    {
      action: "store",
      type: "string",
      help: "Username on CR",
    }
  );
  loginC.addArgument(
    ["password"],
    {
      action: "store",
      type: "string",
      help: "Password on CR",
    }
  );
  const logout = subparsers.addParser("logout", { addHelp: true, description: "Logs out of CR." });
  const download = subparsers.addParser("download", { aliases: ["dl"], addHelp: true, description: "Downloads video or playlist form URL." });
  download.addArgument(
    ["-c", "--connections"],
    {
      action: "store",
      type: "int",
      help: "Number of simultaneous connections (default: 20)",
      defaultValue: 20,
      metavar: "N"
    }
  );
  download.addArgument(
    ["url"],
    {
      action: "store",
      type: "string",
      help: "url of video or playlist"
    }
  );

  download.addArgument(
    ["resolution"],
    {
      action: "store",
      type: "string",
      help: "desired resolution (default: 1080p)",
      defaultValue: "1080p",
      nargs: '?'
    }
  );
  download.addArgument(
    ["seasonNumber"],
    {
      action: "store",
      type: "string",
      help: "Download only specified season. Only for playlist-links.",
      nargs: '?'
    }
  );
  download.addArgument(
    ["-l", "--language"],
    {
      action: "store",
      type: "string",
      help: "Specify subtitle language to set as default. (eg. enUS)",
      metavar: "LANG"
    }
  );

  const args = parser.parseArgs();

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