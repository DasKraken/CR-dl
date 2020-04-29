# CR-dl
*Read this in other language*: [Deutsch](README.de.md)

CR-dl is a tool to quickly download anime from [Crunchyroll](http://www.crunchyroll.com/)

## Installation

Windows users can get a Windows bundle from the [Releases Page](https://github.com/DasKraken/CR-dl/releases).


### Without using the bundle:

CR-dl requires [node.js (v12 or later)](https://nodejs.org) and [ffmpeg](https://www.ffmpeg.org) to be installed on the system and available in PATH

After these are installed run:

    npm install -g https://github.com/DasKraken/CR-dl.git

now you can run it with ```cr-dl```

## Usage
CR-dl is a CLI-Tool and can only be run from the terminal. 

*Note:* If you use the Windows bundle with Powershell, instead of calling ```cr-dl```, you have to write it out: ```.\cr-dl.exe``` .

Following commands are available:


Log in into Crunchyroll to be get access to premium content (This will create a file 'cookies.data' to store the session). If username and/or password is not given, it will prompt you for them:
```
cr-dl login [username] [password]
```


Log out:
```
cr-dl logout
```

Change the language of Crunchyroll. This will change the language of the metadata for file naming. 
Note 1: This wont change the default subtitle language.
Note 2: Series that aren't available in selected language may not work.
Allowed values are: enUS, enGB, esLA, esES, ptBR, ptPT, frFR, deDE, arME, itIT, ruRU
```
cr-dl language <LANG>
```


Downloading a video or a series from a URL:
```
cr-dl download <URL>
```

### Optional arguments:
Following optional arguments can be provided to 'download':
```-f <resolution>, --format <resolution>```
Video resolution (default: "1080p")

```--season <LIST>```
A season number or a comma-separated list (without spaces) of season numbers to download. A ```-``` (minus) can be used to specify a range (e.g. ```1,3-5```). Works only for series-links. Note: Season 1 is the bottom-most season on the website.

```--episode <EPISODE>```
A comma-separated list of episode numbers to download. A ```-``` (minus) can be used to specify a range (e.g. ```01,03-05,SP2```). If a given episode number exists in multiple seasons, you must specify one with --season.
 
```-c N, --connections <N>```
Number of simultaneous connections (default: 5)

```--sub-lang <LANGS>```
Specify subtitle languages as a comma separated list to include in video. (e.g. deDE,enUS). Set to ```none``` to embed no subtitles. Use --list-subs for available languages. (Default: All available)

```--default-sub <LANG>```
Specify subtitle language to be set as default. (e.g. enUS). (Default: if --sub-lang defined: first entry, otherwise: crunchyroll default)

```--attach-fonts```
Automatically download and attach all fonts that are used in subtitles.

```--list-subs```
Don't download. List all available subtitles for the video.

```--subs-only```
Download only subtitles. No Video.

```--hardsub```
Download hardsubbed video stream. Only one subtitle language specified by --default-sub will be included.

```--retry <N>```
Max number of download attempts before aborting. (Default: 5)

```--no-progress-bar```
Hide progress bar.

```--proxy <url>```
HTTP(s) proxy to access Crunchyroll. This is enough to bypass geo-blocking.

```--proxy-cdn <url>```
HTTP proxy used to download video files. Not required for bypassing geo-blocking.

```-o <OUTPUT>, --output <OUTPUT>```
Output filename template, see the "OUTPUT TEMPLATE" for all the info


### OUTPUT TEMPLATE
Output template is a string specified with -o where every {...} will be replaced with the value represented by given name. 
Default is ``` -o "{seasonTitle} [{resolution}]/{seasonTitle} - {episodeNumber} - {episodeTitle} [{resolution}].mkv" ```

Allowed names are:

**{episodeTitle}**: Title of the episode.

**{seriesTitle}**: Title of the series. (seasonTitle should be preferred to differentiate seasons)

**{episodeNumber}**: Episode number in two digits e.g. "02". Can also be a special episode e.g. "SP1"

**{seasonTitle}**: Title of the season.

**{resolution}**: Resolution of the video. E.g. 1080p


Additionally you can append **!scene** to the name e.g. ```{seasonTitle!scene}``` to make it a dot separated title as used in Scene releases.
E.g. **"Food Wars! Shokugeki no Sōma" => "Food.Wars.Shokugeki.no.Soma"**

### Template examples:
Name it like a scene release:

    -o "{seasonTitle!scene}.{resolution}.WEB.x264-byME/{seasonTitle!scene}.E{episodeNumber}.{resolution}.WEB.x264-byME.mkv"

Name it like a Fansub:

    -o "[MySubs] {seasonTitle} - {episodeNumber} [{resolution}].mkv"

## Examples

Log in as user "MyName" with password entered in prompt:
```
> cr-dl login "MyName"
Enter password:
```

Download episode 4 of HINAMATSURI:
```
cr-dl download http://www.crunchyroll.com/hinamatsuri/episode-4-disownment-rock-n-roll-fever-769303
```


Download all episodes of HINAMATSURI in 720p using 10 simultaneous connections, and will set the default subtitle language to enUS:
```
cr-dl download -c 10 -default-sub enUS http://www.crunchyroll.com/hinamatsuri -f 720p
```


Download only the second season of Food Wars in 1080p:
```
cr-dl download http://www.crunchyroll.com/food-wars-shokugeki-no-soma --season 2
```


Download Bungo Stray Dogs 1 and 2:
```
cr-dl download http://www.crunchyroll.com/bungo-stray-dogs --season 6,7
```


Download episodes 1,3,4,5 and special 2 of DITF (SP2 is not available anymore):
```
cr-dl download http://www.crunchyroll.com/darling-in-the-franxx --episode 1,3-5,SP2
```


Download video and add only german and english subs and set german as default:
```
cr-dl download --sub-lang deDE,enUS <URL>
```

Download video and name it like a scene release:
```
cr-dl download -o "{seasonTitle!scene}.{resolution}.WEB.x264-byME/{seasonTitle!scene}.E{episodeNumber}.{resolution}.WEB.x264-byME.mkv" <URL>
```



## License
This is free and unencumbered software released into the public domain.

Anyone is free to copy, modify, publish, use, compile, sell, or
distribute this software, either in source code form or as a compiled
binary, for any purpose, commercial or non-commercial, and by any
means.

In jurisdictions that recognize copyright laws, the author or authors
of this software dedicate any and all copyright interest in the
software to the public domain. We make this dedication for the benefit
of the public at large and to the detriment of our heirs and
successors. We intend this dedication to be an overt act of
relinquishment in perpetuity of all present and future rights to this
software under copyright law.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS BE LIABLE FOR ANY CLAIM, DAMAGES OR
OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE,
ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
OTHER DEALINGS IN THE SOFTWARE.

For more information, please refer to <http://unlicense.org/>
