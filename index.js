const request = require('request');
const { NodeHttpClient, setCookieJar } = require("./src/NodeHttpClient");
const SubtitleToAss = require("./src/SubtitleToAss");
const downloadVideoFromM3U = require("./src/m3u-download");
const processVideo = require("./src/processVideo");
const { getMedia, setHttpClient } = require("crunchyroll-lib/index");
const fs = require("fs");
const langs = require('langs');

let jar = request.jar()
setCookieJar(jar);

// Set the Http client to Node
setHttpClient(NodeHttpClient);
const httpClientInstance = new NodeHttpClient();

const resolutionOrder = [
  "360p",
  "480p",
  "720p",
  "1080p"
]

function pad(num, size) {
  var s = num + "";
  while (s.length < size) s = "0" + s;
  return s;
}

var deleteFolderRecursive = function (path) {
  if (fs.existsSync(path)) {
    fs.readdirSync(path).forEach(function (file, index) {
      var curPath = path + "/" + file;
      if (fs.lstatSync(curPath).isDirectory()) { // recurse
        deleteFolderRecursive(curPath);
      } else { // delete file
        fs.unlinkSync(curPath);
      }
    });
    fs.rmdirSync(path);
  }
};

function loadCookieJar() {
  if (fs.existsSync("cookies.data")) {
    jar._jar._importCookiesSync(JSON.parse(fs.readFileSync("cookies.data")));
  }
}
function saveCookieJar() {
  fs.writeFileSync("cookies.data", JSON.stringify(jar._jar.serializeSync()));
}

function toFilename(str) {
  return str.replace(/[\\/:*?"<>|]+/g, "_")
}

function cleanUp() {
  try {
    deleteFolderRecursive("SubData");
  } catch (e) { };
  try {
    deleteFolderRecursive("VodVidData");
  } catch (e) { };
  try {
    fs.unlinkSync("VodVid.m3u8")
  } catch (e) { };
}

async function login(username, password) {
  /*const loginPage = (await httpClientInstance.get("https://www.crunchyroll.com/login"));
  if (loginPage.status == 302) {
    console.log("Already logged in!")
    return;
  }
  const loginTokenMatch = /name="login_form\[_token\]" value="([^"]+)" \/>/.exec(loginPage.body)
  if (!loginTokenMatch) {
    throw new Error("Error logging in: No login token found.");
  }
  const token = loginTokenMatch[1];

  const loginSend = (await httpClientInstance.post("https://www.crunchyroll.com/login", {
    "login_form[_token]": token,
    "login_form[name]": username,
    "login_form[password]": password,
    "login_form[redirect_url]": "/"
  }));
  if (loginPage.status == 302) {
    console.log("Login successful");
    return;
  } else {
    throw new Error("Couldn't log in. Wrong credentials?");
  }*/

  try {
    const loginReq = await httpClientInstance.post("https://www.crunchyroll.com/?a=formhandler", {
      'formname': 'RpcApiUser_Login',
      'next_url': 'https://www.crunchyroll.com/acct/membership',
      'name': username,
      'password': password
    });
  } catch (e) { }

  async function loggedIn() {
    let res = await httpClientInstance.get("http://www.crunchyroll.com/videos/anime");
    return res.body.indexOf("<a href=\"/logout\"") > -1
  }
  saveCookieJar();
  if (await loggedIn()) {
    console.log("Login successful");
  } else {
    console.error("Couldn't log in. Wrong credentials?");
  }

}
async function getMaxWantedResolution(url, res) {
  if (resolutionOrder.indexOf(res) == -1)
    throw new Error("Unsupported resolution. Valid are: " + resolutionOrder.join(", "));
  res = res || "1080p";
  const page = (await httpClientInstance.get(url)).body;
  const regex = /<a href="(?!\/freetrial)[^"]+" token="showmedia.([^"]+)" class="[^"]+" title="[^"]+">[^<]+<\/a>/gm;
  let r = undefined;
  let m;
  while ((m = regex.exec(page)) !== null) {
    if (m[1] == res) {
      return res;
    } else {
      if (resolutionOrder.indexOf(m[1]) == -1) {
        console.log("WARNING: Unknown Resolution: " + m[1])
      }
      if (r == undefined || ((resolutionOrder.indexOf(m[1]) > resolutionOrder.indexOf(r)) && (resolutionOrder.indexOf(m[1]) < resolutionOrder.indexOf(res)))) {
        r = m[1];
      }
    }
  }
  if (r == undefined) {
    throw new Error("No downloadable video found. Are you logged in?")
  }
  console.log(`Resolution ${res} not available. Using ${r} instead.`)
  return r;
}



async function downloadPlaylistUrl(url, resolution, onlySeason, options) {
  let list = [];
  let seasonNum = -1;
  let page;
  try { page = (await httpClientInstance.get(url)).body; } catch (e) { console.log("Error " + e.status) }
  const regex = /(?:<a href="([^"]+)" title="([^"]+)"\s+class="portrait-element block-link titlefix episode">)|(?:<a href="#"\s+class="season-dropdown content-menu block text-link strong (?:open)? small-margin-bottom"\s+title="([^"]+)">[^<]+<\/a>)/gm;
  let m;
  list[0] = { name: "", episodes: [] }
  while ((m = regex.exec(page)) !== null) {
    if (m[3]) {
      if (seasonNum != -1) list[seasonNum].episodes = list[seasonNum].episodes.reverse();
      seasonNum++;
      list[seasonNum] = { name: m[3], episodes: [] };
    } else {
      if (seasonNum == -1) seasonNum = 0;
      list[seasonNum].episodes.push({ url: m[1], name: m[2] });
    }
  }
  if (seasonNum != -1) list[seasonNum].episodes = list[seasonNum].episodes.reverse();
  list = list.reverse();

  if (onlySeason) {
    if (isNaN(onlySeason) || parseInt(onlySeason) > list.length || parseInt(onlySeason) < 1) {
      console.error("Invalid season number: " + onlySeason);
      return;
    } else {
      list = [list[parseInt(onlySeason) - 1]];
    }
  }

  if (list.length == 1 && list[0].episodes.length == 0) {
    console.error("No Episodes found.")
    return;
  }

  for (const season of list) {
    for (const episode of season.episodes) {
      let destination = "";
      if (list.length > 1 || season.name != "") destination = pad(list.indexOf(season) + 1, 2) + ". " + toFilename(season.name) + "/";
      try {
        fs.mkdirSync(destination)
      } catch (e) { }
      console.log("Downloading S(" + pad(list.indexOf(season) + 1, 2) + "/" + pad(list.length, 2) + ")E(" + pad(season.episodes.indexOf(episode) + 1, 2) + "/" + pad(season.episodes.length, 2) + ") - " + destination + episode.name);
      await downloadVideoUrl("http://www.crunchyroll.com" + episode.url, resolution, destination, options)
    }
  }

  // console.log(JSON.stringify(list, undefined, "  "))
}
async function downloadVideoUrl(url, resolution, destination, options) {
  destination = destination || "";
  resolution = await getMaxWantedResolution(url, resolution)
  const videoIdMatch = /([0-9]+)$/.exec(url);
  if (!videoIdMatch) {
    throw new Error("Invalid video URL");
  }
  const media = await getMedia(videoIdMatch[1], resolution, url);
  //media.
  const subtitles = media.getSubtitles();
  try { fs.mkdirSync("SubData") } catch (e) { }
  const subs = [];
  for (let i = 0; i < subtitles.length; i++) {
    const stta = new SubtitleToAss(subtitles[i]);
    const subtitleModel = await stta.getModel();
    const langCode = langs.where("1", subtitleModel.langCode.substring(0, 2))["2T"];
    const langString = subtitles[i].getTitle().match(/\[(.*)\]/)[1];
    const title = langString;
    const ass = await stta.getContentAsAss();
    const filename = "SubData/" + subtitleModel.langCode + ".ass"
    fs.writeFileSync(filename, ass)
    subs.push({
      title: title,
      language: langCode,
      path: filename,
      default: options.language ? options.language == subtitleModel.langCode : subtitles[i].isDefault()
    })

  }
  const metadata = {
    episodeTitle: media.getMetadata().getEpisodeTitle(),
    seriesTitle: media.getMetadata().getSeriesTitle(),
    episodeNumber: media.getMetadata().getEpisodeNumber()
  }

  if (!isNaN(metadata.episodeNumber)) {
    metadata.episodeNumber = pad(metadata.episodeNumber, 2)
  }

  const outputFileName = destination + toFilename(metadata.seriesTitle) + " - " + toFilename(metadata.episodeNumber) + " - " + toFilename(metadata.episodeTitle) + " [" + resolution + "]" + ".mkv"

  await downloadVideoFromM3U(media.getStream().getFile(), "VodVid", options)
  await processVideo("VodVid.m3u8", metadata, subs, outputFileName)
  saveCookieJar();
  cleanUp();
}

const run = async () => {

  const ArgumentParser = require("argparse").ArgumentParser;
  const parser = new ArgumentParser({
    version: "0.0.1",
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

  loadCookieJar();

  if (args.subcommand_name == "login") {
    //console.log("'" + args[3] + "'", "'" + args[4] + "'")
    await login(args.username, args.password);

  } else if (args.subcommand_name == "logout") {
    jar = request.jar()
    setCookieJar(jar);

  } else if (args.subcommand_name == "download" || args.subcommand_name == "dl") {
    if (/www\.crunchyroll\.com\/[^/]+\/[^/]+-[0-9]+/.exec(args.url)) {
      await downloadVideoUrl(args.url, args.resolution, undefined, args);
    } else {
      await downloadPlaylistUrl(args.url, args.resolution, args.season, args);
    }
  } else {
    console.error("unknown command: " + command)
  }
  saveCookieJar()
}
run(process.argv)
  .then(() => {
    console.log("Cleanup..");
    cleanUp();
  }, (err) => {
    console.error(err)
    console.log("Cleanup..");
    cleanUp();
  });