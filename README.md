# CR-dl

CR-dl is a tool to quickly download anime from [Crunchyroll](http://www.crunchyroll.com/)

## Installation

CR-dl requires [node.js](https://nodejs.org), [ffmpeg](https://www.ffmpeg.org) and [git](https://git-scm.com/) to be installed on the system and available in PATH

After these are installed, enter project directory and run

    npm install


## Usage
CR-dl is a CLI-Tool and can only be run from the terminal. Following commands are available:


Logging in into Crunchyroll to be able accessing premium content (This will create a file 'cookies.data' to store the session):
```
node index.js login <username> <password>
```


Logging out:
```
node index.js logout
```

Changing the language of Crunchyroll. This will change the language of the metadata for file naming. 
Note 1: This wont change the default subtitle language.
Note 2: Series that aren't available in selected language may not work.
Allowed are: enUS, enGB, esLA, esES, ptBR, ptPT, frFR, deDE, arME, itIT, ruRU
```
node index.js language LANG
```


Downloading a video from URL. A resolution can be provided optionally (360p, 480p, 720p, 1080p):
```
node index.js download <URL> [resolution]
```


Downloading a series from URL. This will download all videos in the given playlist:
```
node index.js download <URL> [resolution]
```


Downloading only one season of a series from URL. This will download only the videos of the given season number:
```
node index.js download <URL> <resolution> <seasonNumber>
```

### Optional arguments:
 Following optional arguments can be provided to 'download':
 
```-c N, --connections N```
Number of simultaneous connections (default: 20)

```--subLangs LANGS```
Specify subtitle languages as a comma separated list to include in video. (eg. deDE,enUS)

```-l LANG, --subDefault LANG```
Specify subtitle language to be set as default. (eg.enUS). (Default: if --subLangs defined: first entry, otherwise: crunchyroll default)

```--listSubs```
Don't download. Show list of available subtitle languages.

```--maxAttempts N```
Max number of download attempts before aborting. (Default: 5)

```--hideProgressBar```
Hide progress bar.

```-o OUTPUT, --output OUTPUT```
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

## Examples
```
node index.js login "MyName" "Pass123"
```
Will log you in as user "MyName" with password "Pass123"


```
node index.js download http://www.crunchyroll.com/hinamatsuri/episode-4-disownment-rock-n-roll-fever-769303"
```
Will download episode 4 of HINAMATSURI


```
node index.js download -c 10 -l enUS http://www.crunchyroll.com/hinamatsuri 720p
```
Will download all episodes of HINAMATSURI in 720p using 10 simultaneous connections, and will set the default subtitle language to enUS.


```
node index.js download http://www.crunchyroll.com/food-wars-shokugeki-no-soma 1080p 2
```
Will download only the second season of Food Wars in 1080p

```
node index.js download --subLangs deDE,enUS URL
```
Will download video and add only german and english subs to container with german as default.

```
node index.js download -o "{seasonTitle!scene}.{resolution}.WEB.x264-byME/{seasonTitle!scene}.E{episodeNumber}.{resolution}.WEB.x264-byME.mkv" URL
```
Will download video and name it like a scene release


## License
MIT License

Copyright (c) 2018 DerKraken

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
