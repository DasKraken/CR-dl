#!/usr/bin/env node
import { Command } from 'commander';
import * as read from 'read';
import { loadCookies, getRequester, saveCookies } from './common';
import { CrDl } from '../api/CrDl';
import { UserInputError } from '../Errors';

export const logout = new Command();

logout
    .name("logout")
    .description("Logs out of CR.")
    .option('--proxy <proxy>', 'HTTP proxy used to access Crunchyroll.')
    .action(async function (cmdObj) {

        const options: { proxy?: string } = { proxy: cmdObj.proxy };

        loadCookies();
        const requester = getRequester(options);
        const crDl = new CrDl({ requester: requester });

        try {
            await crDl.logout();
            console.log("Successfully logged out!")
        } catch (error) {
            if (error instanceof UserInputError) {
                console.log(error.message) // Dont print stacktrace
            } else {
                console.log(error)
            }
        }
        saveCookies();
    })