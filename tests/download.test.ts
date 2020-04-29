import { CrDl } from "../src/api/CrDl"

test("CrDl getEpisodesFromUrl", async () => {
    jest.setTimeout(100000);
    const crdl = new CrDl();
    await crdl.setLang("deDE");
    const seasons = await crdl.getEpisodesFormUrl("https://www.crunchyroll.com/new-game")
    //console.log(JSON.stringify(seasons));

    expect(seasons).toStrictEqual([
        {
            "name": "(OmU) NEW GAME!",
            "episodes": [{ "url": "/de/new-game/episode-1-it-actually-feels-like-i-started-my-job-715393", "name": "(OmU) NEW GAME! Folge 1", "number": "1" }, { "url": "/de/new-game/episode-2-so-this-is-an-adult-drinking-party-715395", "name": "(OmU) NEW GAME! Folge 2", "number": "2" }, { "url": "/de/new-game/episode-3-what-happens-if-im-late-to-work-715397", "name": "(OmU) NEW GAME! Folge 3", "number": "3" }, { "url": "/de/new-game/episode-4-the-first-paycheck-715399", "name": "(OmU) NEW GAME! Folge 4", "number": "4" }, { "url": "/de/new-game/episode-5-thats-how-many-nights-we-have-to-stay-over-715401", "name": "(OmU) NEW GAME! Folge 5", "number": "5" }, { "url": "/de/new-game/episode-6-like-the-release-is-canceled-715403", "name": "(OmU) NEW GAME! Folge 6", "number": "6" }, { "url": "/de/new-game/episode-7-please-train-the-new-hires-properly-715405", "name": "(OmU) NEW GAME! Folge 7", "number": "7" }, { "url": "/de/new-game/episode-8-its-summer-break-715407", "name": "(OmU) NEW GAME! Folge 8", "number": "8" }, { "url": "/de/new-game/episode-9-do-we-have-to-come-into-work-715409", "name": "(OmU) NEW GAME! Folge 9", "number": "9" }, { "url": "/de/new-game/episode-10-full-time-employment-is-a-loophole-in-the-law-to-make-wages-lower-715411", "name": "(OmU) NEW GAME! Folge 10", "number": "10" }, { "url": "/de/new-game/episode-11-there-were-leaked-pictures-of-the-game-on-the-internet-yesterday-715413", "name": "(OmU) NEW GAME! Folge 11", "number": "11" }, { "url": "/de/new-game/episode-12-one-of-my-dreams-came-true-715415", "name": "(OmU) NEW GAME! Folge 12", "number": "12" }],
            "isLanguageUnavailable": false,
            "isRegionBlocked": false
        },
        {
            "name": "(OmU) NEW GAME!!",
            "episodes": [{ "url": "/de/new-game/episode-1-of-all-the-embarrassing-things-to-be-caught-doing-742151", "name": "(OmU) NEW GAME!! Folge 1", "number": "1" }, { "url": "/de/new-game/episode-2-this-is-just-turning-into-cos-purr-lay-742153", "name": "(OmU) NEW GAME!! Folge 2", "number": "2" }, { "url": "/de/new-game/episode-3-ooh-im-so-embarrassed-742155", "name": "(OmU) NEW GAME!! Folge 3", "number": "3" }, { "url": "/de/new-game/episode-4-how-dense-can-you-be-742157", "name": "(OmU) NEW GAME!! Folge 4", "number": "4" }, { "url": "/de/new-game/episode-5-hey-dont-touch-me-there-742159", "name": "(OmU) NEW GAME!! Folge 5", "number": "5" }, { "url": "/de/new-game/episode-6-wow-its-so-amazing-742161", "name": "(OmU) NEW GAME!! Folge 6", "number": "6" }, { "url": "/de/new-game/episode-7-im-sensing-a-very-intense-gaze-742163", "name": "(OmU) NEW GAME!! Folge 7", "number": "7" }, { "url": "/de/new-game/episode-8-im-telling-you-i-want-a-maid-caf-742165", "name": "(OmU) NEW GAME!! Folge 8", "number": "8" }, { "url": "/de/new-game/episode-9-at-least-put-a-shirt-on-742167", "name": "(OmU) NEW GAME!! Folge 9", "number": "9" }, { "url": "/de/new-game/episode-10-its-gonna-really-break-the-immersion-742169", "name": "(OmU) NEW GAME!! Folge 10", "number": "10" }, { "url": "/de/new-game/episode-11-whats-hidden-in-your-heart-742171", "name": "(OmU) NEW GAME!! Folge 11", "number": "11" }, { "url": "/de/new-game/episode-12-make-sure-you-buy-it-742173", "name": "(OmU) NEW GAME!! Folge 12", "number": "12" }],
            "isLanguageUnavailable": false,
            "isRegionBlocked": false
        },
        {
            "name": "NEW GAME! (Russian)",
            "episodes": [],
            "isLanguageUnavailable": false,
            "isRegionBlocked": true
        },
        {
            "name": "NEW GAME!! (Russian)",
            "episodes": [],
            "isLanguageUnavailable": false,
            "isRegionBlocked": true
        },
        {
            "name": "(EN) NEW GAME!",
            "episodes": [],
            "isLanguageUnavailable": true,
            "isRegionBlocked": false
        },
        {
            "name": "(EN) NEW GAME!!",
            "episodes": [],
            "isLanguageUnavailable": true,
            "isRegionBlocked": false
        }
    ]);
});

test("CrDl getEpisodesFromUrl", async () => {

});