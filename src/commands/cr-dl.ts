#!/usr/bin/env node
import { program } from "commander";
import { login } from "./cr-dl-login";
import { logout } from "./cr-dl-logout";
import { language } from "./cr-dl-language";
import { download } from "./cr-dl-download";

program.version("4.0.1")
    .addCommand(login)
    .addCommand(logout)
    .addCommand(language)
    .addCommand(download);


/*gf.command("login", "Login into CR. Cookies are stores in "cookies.data".")
    .command("logout", "Logs out of CR.")
    .action((a) => { console.log(a) })*/

program.parseAsync(process.argv).catch(console.log);
