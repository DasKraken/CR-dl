#!/usr/bin/env node
import { Command } from "commander";
import read from "read";
import { loadCookies, getRequester, saveCookies } from "./common";
import { CrDl } from "../api/CrDl";
import { UserInputError } from "../Errors";

export const login = new Command();

login
    .name("login")
    .description("Login into CR. Cookies are stores in \"cookies.data\".")
    .arguments("[username] [password]")
    .option("--proxy <proxy>", "HTTP proxy used to access Crunchyroll.")
    .option("--cookies <FILE>", "File to read cookies from and dump cookie jar in", "cookies.txt")
    .action(async function (username: string | undefined, password: string | undefined, cmdObj) {

        const options: { proxy?: string; cookies: string } = { proxy: cmdObj.proxy, cookies: cmdObj.cookies };

        loadCookies(options);
        const requester = getRequester(options);
        const crDl = new CrDl({ requester: requester });
        if (await crDl.isLoggedIn()) {
            console.log("Already logged in!");
            saveCookies(options);
            return;
        }

        if (!username) {
            username = await new Promise<string>((resolve, reject) => {
                read({ prompt: "Enter username: " }, (er, user: string) => { if (er) { reject(er); } else { resolve(user); } });
            });

        }
        if (!password) {
            password = await new Promise<string>((resolve, reject) => {
                read({ prompt: "Enter password: ", silent: true }, (er, pass: string) => { if (er) { reject(er); } else { resolve(pass); } });
            });
        }

        try {
            await crDl.login(username, password);
            console.log("Successfully logged in!");
        } catch (error) {
            if (error instanceof UserInputError) {
                console.log(error.message); // Dont print stacktrace
            } else {
                console.log(error);
            }
        }
        saveCookies(options);
    });
