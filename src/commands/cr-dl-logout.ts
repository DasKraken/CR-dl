#!/usr/bin/env node
import { Command } from "commander";
import { loadCookies, getRequester, saveCookies } from "./common";
import { CrDl } from "../api/CrDl";
import { UserInputError } from "../Errors";

export const logout = new Command();

logout
    .name("logout")
    .description("Logs out of CR.")
    .option("--proxy <proxy>", "HTTP proxy used to access Crunchyroll.")
    .option("--cookies <FILE>", "File to read cookies from and dump cookie jar in", "cookies.txt")
    .action(async function (cmdObj) {

        const options: { proxy?: string; cookies: string } = { proxy: cmdObj.proxy, cookies: cmdObj.cookies };

        loadCookies(options);
        const requester = getRequester(options);
        const crDl = new CrDl({ requester: requester });

        try {
            await crDl.logout();
            console.log("Successfully logged out!");
        } catch (error) {
            if (error instanceof UserInputError) {
                console.log(error.message); // Dont print stacktrace
            } else {
                console.log(error);
            }
        }
        saveCookies(options);
    });
