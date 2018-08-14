# CR-dl
*Auf anderer Sprache lesen*: [English](README.md)

CR-dl ist ein Tool um schnell und einfach von [Crunchyroll](http://www.crunchyroll.com/) herunterladen zu können.

## Installation

Windows Nutzer können von der [Releases Seite](https://github.com/DasKraken/CR-dl/releases) ein Windows-Bundle mit allen Abhängigkeiten runterladen.


### Falls das Bundle nicht verwendet wird:

CR-dl erfordert, dass [node.js](https://nodejs.org) und [ffmpeg](https://www.ffmpeg.org) auf dem System installiert sind und über PATH erreichbar sind.

Nachdem sie installiert sind, führt aus:

    npm install -g https://github.com/DasKraken/CR-dl.git

nun kann man es mit ```cr-dl``` aufrufen.

## Verwendung
CR-dl ist ein CLI-Programm und kann somit nur über die Konsole aufgeführt werden.

Bei Windows könnt ihr eine Konsole öffnen indem ihr im Projektverzeichnis (wo sich die cr-dl.exe befindet) bei gedrückter Shift-Taste rechtsklickt und im Kontextmenü 
"Powershell Fenster hier öffnen" oder "Eingabeaufforderung hier öffnen" auswählt.

*Anmerkung:* Falls Windows-Bundle mit Powershell verwendet wird, kann man es nicht mit ```cr-dl``` aufrufen, sondern muss ausgeschrienben werden: ```.\cr-dl.exe```.

Folgende Befehle können verwendet werden:

Sich in Crunchyroll einloggen um auf Premiumcontent zuzugreifen (Dies erstellt die Datei 'cookies.data' , die die Sitzung speichert):
```
cr-dl login <username> <password>
```


Ausloggen:
```
cr-dl logout
```

Ändern der Sprache von CR und somit die Sprache der Dateibenennung. 
Anmerkung 1: Dies ändert nicht die Untertitelsprache
Anmerkung 2: Videos die nicht in der gewählten Sprache verfügbar sind werden evtl. nicht heruntergeladen.
Erlaubt sind: enUS, enGB, esLA, esES, ptBR, ptPT, frFR, deDE, arME, itIT, ruRU
```
cr-dl language LANG
```


Ein Video von einer URL herunterladen. Optional kann eine Auflösung angegeben werden (360p, 480p, 720p, 1080p):
```
cr-dl download <URL> [auflösung]
```


Eine Serie von einer URL herunterladen. Dies lädt alle Videos in der Playlist herunter:
```
cr-dl download <URL> [auflösung]
```


Nur eine Staffel einer Serie von einer URL herunterladen. Dies lädt nur die Videos der angegebenen Staffelnummer herunter:
```
cr-dl download <URL> <auflösung> <staffelNummer>
```

### Optionale Argumente:
Folgende optionale Arguments können mit 'download' verwendet werden:
 
```-c N, --connections N```
Anzahl der gleichzeitigen Verbindungen (default: 20)

```--subLangs LANGS```
Eine kommagetrennte Liste (ohne Leerzeichen) an Sprachen die in das Video eingebettet werden sollen. (z.B.: deDE,enUS)

```-l LANG, --subDefault LANG```
Sprache, dessen Untertitel als Standard ausgewählt werden sollen. (z.B: enUS). Standard ist der erste Eintrag von --subLangs, falls angegeben, ansonsten CR-Standard.

```--listSubs```
Video nicht runterladen. Zeigt nur Liste an verfügbaren Sprachen an.

```--maxAttempts N```
Anzahl Wiederholungsversuche bei Netzwerkproblemen. (Standard: 5)

```--hideProgressBar```
Keinen Fortschrittsbalken anzeigen.

```-o OUTPUT, --output OUTPUT```
Vorlage zur Ordner- und Dateibenennung. Siehe unten für mehr Informationen

### Ausgabevorlage
Die Ausgabevorlage wird mit -o festgelegt.
Standard ist ```-o "{seasonTitle} [{resolution}]/{seasonTitle} - {episodeNumber} - {episodeTitle} [{resolution}].mkv"```
Dabei wird jedes {...} durch den entsprechenden Text ersetzt.


Erlaubt sind:
**{episodeTitle}**: Titel der Folge.

**{seriesTitle}**: Title der Serie. (Es sollte stattdessen möglichst **{seasonTitle}** verwendet werden um Staffeln zu unterscheiden)

**{episodeNumber}**: Folgennummer in zwei Ziffern z.B.: "02". Kann auch Spezialepisode sein z.B.: "SP1"

**{seasonTitle}**: Titel der Staffel.

**{resolution}**: Auflösung vom Video. z.B.: 1080p

Zusätzlich kann man **!scene** anhängen z.B. ```{seasonTitle!scene}``` um es zu einem durch Punkte separierten Titel zu konvertieren, wie es in Szene-Releases verwendet wird. 
Z.B.: **"Food Wars! Shokugeki no Sōma" => "Food.Wars.Shokugeki.no.Soma"**

### Templatebeispiele:
Benennung es wie ein Szene-Release:

    -o "{seasonTitle!scene}.{resolution}.WEB.x264-byME/{seasonTitle!scene}.E{episodeNumber}.{resolution}.WEB.x264-byME.mkv"

Benennung es wie ein Fansub:

    -o "[MySubs] {seasonTitle} - {episodeNumber} [{resolution}].mkv"


## Beispiele

Einloggen als User "MyName" mit Passwort "Pass123":
```
cr-dl login "MyName" "Pass123"
```


Episode 4 von HINAMATSURI herunterladen: (in 1080p)
```
cr-dl download http://www.crunchyroll.com/hinamatsuri/episode-4-disownment-rock-n-roll-fever-769303"
```


Lädt alle Episoden von HINAMATSURI in 720p mit 10 gleichzeitigen Verbindungen, und setzt die Standard-Untertitelsprache auf enUS:
```
cr-dl download -c 10 -l enUS http://www.crunchyroll.com/hinamatsuri 720p
```


Lädt nur die 2te Staffel von Food Wars in 1080p:
```
cr-dl download http://www.crunchyroll.com/food-wars-shokugeki-no-soma 1080p 2
```

Lädt Video mit deutschen und englischen Untertiteln runter und setzt deutsch als Standard:
```
cr-dl download --subLangs deDE,enUS URL
```


Lädt video(s) und bennent es wie ein Scene-Release:
```
cr-dl download -o "{seasonTitle!scene}.{resolution}.WEB.x264-byME/{seasonTitle!scene}.E{episodeNumber}.{resolution}.WEB.x264-byME.mkv" URL
```



## Lizenz
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
