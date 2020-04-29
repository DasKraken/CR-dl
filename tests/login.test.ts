import { CrDl } from "../src/api/CrDl"
import { Language } from "../src/types/language";

test("CrDl login/logout", async () => {
    jest.setTimeout(100000);
    const crdl = new CrDl();

    expect(await crdl.isLoggedIn()).toBe(false);
    await crdl.login("GeliebtLebhafterLeopard@spam.care", "coat-unadorned-glacier");
    expect(await crdl.isLoggedIn()).toBe(true);
    await crdl.logout();
    expect(await crdl.isLoggedIn()).toBe(false);
})


test("CrDl setLang/getLang", async () => {
    jest.setTimeout(100000);
    const crdl = new CrDl();
    const languages: Language[] = ["enUS", "enGB", "esLA", "esES", "ptBR", "ptPT", "frFR", "deDE", "arME", "itIT", "ruRU"];

    expect(typeof (await crdl.getLang())).toBe("string");

    for (const lang of languages) {
        await crdl.setLang(lang);
        expect(await crdl.getLang()).toBe(lang);
    }
})

