# CR-dl

DR-dl is a tool to quickly download anime from [Crunchyroll](http://www.crunchyroll.com/)

## Installation

CR-dl requires [node.js](https://nodejs.org), [ffmpeg](https://www.ffmpeg.org) and [git](https://git-scm.com/) to be installed on the system and available in PATH

To setup, enter project directory and run
```
npm install
```

## Usage
CR-dl is a CLI-Tool and can only be run from the terminal


Logging in into Crunchyroll to be able accessing premium content (This will create a file 'cookies.data' to store the session):
```
node index.js login <username> <password>
```


Logging out:
```
node index.js logout
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

```-l LANG, --language LANG```
Specify subtitle language to be set as default. (eg.enUS). By default it will use the crunchyroll default selection.


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


## License
All rights reserved.

