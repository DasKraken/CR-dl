#!/usr/bin/env node
import { Command } from "commander";
import { loadCookies, getRequester, saveCookies } from "./common";
import { CrDl } from "../api/CrDl";
import { UserInputError } from "../Errors";
import { languages, Language } from "../types/language";

export const language = new Command();

language
    .name("language").alias("lang")
    .description("Get or set the language of CR and metadata. (Note 1: It doesn't change default subtitle language. Note 2: Videos that aren't available in selected language may not work). Available options are: " + languages.join(", "))
    .arguments("[language]")
    .option("--proxy <proxy>", "HTTP proxy used to access Crunchyroll.")
    .action(async function (language: Language | undefined, cmdObj) {

        const options: { proxy?: string } = { proxy: cmdObj.proxy };
        loadCookies();
        const requester = getRequester(options);
        const crDl = new CrDl({ requester: requester });



        if (language) {
            if (!languages.includes(language)) {
                console.log("Unknown language. Must be one of: " + languages.join(", "));
            } else {
                // Set language
                try {
                    await crDl.setLang(language);
                } catch (error) {
                    if (error instanceof UserInputError) {
                        console.log(error.message); // Dont print stacktrace
                    } else {
                        console.log(error);
                    }
                }
            }
        }

        // Get language
        try {
            const language = await crDl.getLang();
            console.log("Selected Language: " + language);
        } catch (error) {
            if (error instanceof UserInputError) {
                console.log(error.message); // Dont print stacktrace
            } else {
                console.log(error);
            }
        }
        saveCookies();
    });


