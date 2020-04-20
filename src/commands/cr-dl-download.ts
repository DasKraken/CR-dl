#!/usr/bin/env node
import { Command } from 'commander';
import * as read from 'read';
import { loadCookies, getRequester, saveCookies } from './common';
import { CrDl } from '../api/CrDlNew';
import { UserInputError } from '../Errors';
import { languages, Language } from '../types/language';

export const download = new Command();

interface Options {
  proxy?: string;
  proxyCdn?: string;
  format: string;
  connections: number;
}

download
  .name("download").alias("dl")
  .description("Download video or series from URL")
  .arguments('<URL>')
  .option('--proxy <url>', 'HTTP proxy used to access Crunchyroll.')
  .option('--proxy-cdn <url>', 'HTTP proxy used to download video files. Not required for bypassing geo-blocking.')
  .option('--format <resolution>', 'Video resolution', "1080p")
  .option('-c, --connections <connections>', 'Number of simultaneous connections', "5")
  .action(async function (url: string, cmdObj) {

    const options: { proxy?: string } = { proxy: cmdObj.proxy };
    loadCookies();
    const requester = getRequester(options);
    const crDl = new CrDl({ requester: requester });
    console.log(cmdObj)

    try {
      if (/www\.crunchyroll\.com\/([a-z-]{1,5}\/)?[^/]+\/[^/]+-[0-9]+$/.exec(url)) {
        await downloadVideo(url, args.resolution, args);
      } else if (/www\.crunchyroll\.com\/([a-z-]{1,5}\/)?[^/]+\/?$/.exec(url)) {
        await downloadSeries(url, args.resolution, args);
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

  });



async function downloadVideo(url: String, crDl: CrDl, options: { connections: number }) {

}
async function downloadSeries(url: String, crDl: CrDl, options: { connections: number }) {

}