# CR-dl
*Auf anderer Sprache lesen*: [English](README.md)

CR-dl ist ein Tool um schnell und einfach von [Crunchyroll](http://www.crunchyroll.com/) herunterladen zu können.

## Installation

Windows Nutzer können von der [Releases Seite](https://github.com/DasKraken/CR-dl/releases) ein Windows-Bundle mit allen Abhängigkeiten runterladen.


### Falls das Bundle nicht verwendet wird:

CR-dl erfordert, dass [node.js (v10 oder höher)](https://nodejs.org) und [ffmpeg](https://www.ffmpeg.org) auf dem System installiert sind und über PATH erreichbar sind.

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


Ein Video oder eine Serie von einer URL herunterladen. Optional kann eine Auflösung angegeben werden (360p, 480p, 720p, 1080p):
```
cr-dl download <URL> [auflösung]
```


### Optionale Argumente:
Folgende optionale Argumente können mit 'download' verwendet werden:

```--season SEASON, --seasons SEASONS```
Eine Staffelnummer oder eine kommagetrennte Liste (ohne Leerzeichen) von Staffelnummern zum Herunterladen. Ein ```-``` (Minus) kann verwendet werden um einen Interval anzugeben (z.B.: ```1,3-5```). Funktioniert nur mit Serien-URLs. Anmerkung: Staffel 1 ist die unterste Staffel auf der Webseite.

```--episode EPISODE, --episodes EPISODES```
Eine kommagetrennte Liste (ohne Leerzeichen) von Episodennummern zum Herunterladen. Ein ```-``` (Minus) kann verwendet werden um einen Interval anzugeben (z.B.: ```01,03-05,SP2```). Funktioniert nur mit Serien-URLs. Falls eine angegebene Episodennummer in mehreren Staffeln verfügbar ist, muss eine Staffel mit --season ausgewählt werden.
 
```-c N, --connections N```
Anzahl der gleichzeitigen Verbindungen (default: 5)

```--subLangs LANGS```
Eine kommagetrennte Liste (ohne Leerzeichen) an Sprachen die in das Video eingebettet werden sollen. (z.B.: deDE,enUS). Setze auf ```none``` um keine Untertitel einzubetten.

```-l LANG, --subDefault LANG```
Sprache, dessen Untertitel als Standard ausgewählt werden sollen. (z.B: enUS). Standard ist, falls angegeben, der erste Eintrag von --subLangs, ansonsten CR-Standard.

```--attachFonts```
Lädt automatisch die von den Untertiteln benötigten Schriftarten herunter und hängt sie an die Videodatei an.

```--listSubs```
Video nicht herunterladen. Zeigt nur Liste an verfügbaren Sprachen an.

```--subsOnly```
Lade nur Untertitel herunter. Kein Video.

```--hardsub```
Lade einen Hardsub Videostream runter. Nur eine Untertitelsprache wird eingebettet, die mit --subDefault spezifiziert werden kann.

```--maxAttempts N```
Anzahl Wiederholungsversuche bei Netzwerkproblemen. (Standard: 5)

```--hideProgressBar```
Keinen Fortschrittsbalken anzeigen.

```--legacyPlayer```
Lade Untertitel mit der alten Methode die vom Flash Player verwendet wurde. (Aus irgendeinem Grund nutzen sie unterschiedliche Schriftarten bei älteren Videos).

```--httpProxy PROXY```
HTTP proxy für Zugriff auf Crunchyroll. Dies ist ausreichend um Länderrestriktionen zu umgehen.

```--httpProxyCdn PROXY```
HTTP proxy für Download der Videodateien.


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

Zusätzlich kann man **!scene** anhängen z.B. ```{seasonTitle!scene}``` um es zu einem durch Punkte separierten Titel zu konvertieren, wie es in Scene-Releases verwendet wird. 
Z.B.: **"Food Wars! Shokugeki no Sōma" => "Food.Wars.Shokugeki.no.Soma"**

### Templatebeispiele:
Benenne es wie ein Szene-Release:

    -o "{seasonTitle!scene}.{resolution}.WEB.x264-byME/{seasonTitle!scene}.E{episodeNumber}.{resolution}.WEB.x264-byME.mkv"

Benenne es wie ein Fansub:

    -o "[MySubs] {seasonTitle} - {episodeNumber} [{resolution}].mkv"


## Beispiele

Einloggen als User "MyName" mit Passwort "Pass123":
```
cr-dl login "MyName" "Pass123"
```


Episode 4 von HINAMATSURI herunterladen: (in 1080p)
```
cr-dl download http://www.crunchyroll.com/hinamatsuri/episode-4-disownment-rock-n-roll-fever-769303
```


Lädt alle Episoden von HINAMATSURI in 720p mit 10 gleichzeitigen Verbindungen, und setzt die Standard-Untertitelsprache auf enUS:
```
cr-dl download -c 10 -l enUS http://www.crunchyroll.com/hinamatsuri 720p
```


Lädt nur die 2te Staffel von Food Wars in 1080p:
```
cr-dl download http://www.crunchyroll.com/food-wars-shokugeki-no-soma --season 2
```


Lädt Bungo Stray Dogs 1 and 2:
```
cr-dl download http://www.crunchyroll.com/bungo-stray-dogs --seasons 6,7
```


Lädt die Episoden 1,3,4,5 und Spezial 2 von DITF (SP2 nicht mehr verfügbar):
```
cr-dl download http://www.crunchyroll.com/darling-in-the-franxx --episodes 1,3-5,SP2
```


Lädt Video mit deutschen und englischen Untertiteln herunter und setzt deutsch als Standard:
```
cr-dl download --subLangs deDE,enUS URL
```


Lädt Video(s) und bennent es wie ein Scene-Release:
```
cr-dl download -o "{seasonTitle!scene}.{resolution}.WEB.x264-byME/{seasonTitle!scene}.E{episodeNumber}.{resolution}.WEB.x264-byME.mkv" URL
```



## Lizenz
MIT License

Copyright (c) 2019 DerKraken

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
