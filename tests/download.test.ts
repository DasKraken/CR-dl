import { CrDl } from "../src/CrDlNew"

test("CrDl getEpisodesFromUrl", async () => {
    jest.setTimeout(100000);
    const crdl = new CrDl();
    await crdl.setLang("enUS");
    const seasons = await crdl.getEpisodesFormUrl("https://www.crunchyroll.com/new-game")
    //console.log(JSON.stringify(episodes));

    expect(seasons).toStrictEqual([
        {
            "name": "NEW GAME!",
            "episodes": [{ "url": "/new-game/episode-1-it-actually-feels-like-i-started-my-job-715393", "name": "NEW GAME! Episode 1", "number": "1" }, { "url": "/new-game/episode-2-so-this-is-an-adult-drinking-party-715395", "name": "NEW GAME! Episode 2", "number": "2" }, { "url": "/new-game/episode-3-what-happens-if-im-late-to-work-715397", "name": "NEW GAME! Episode 3", "number": "3" }, { "url": "/new-game/episode-4-the-first-paycheck-715399", "name": "NEW GAME! Episode 4", "number": "4" }, { "url": "/new-game/episode-5-thats-how-many-nights-we-have-to-stay-over-715401", "name": "NEW GAME! Episode 5", "number": "5" }, { "url": "/new-game/episode-6-like-the-release-is-canceled-715403", "name": "NEW GAME! Episode 6", "number": "6" }, { "url": "/new-game/episode-7-please-train-the-new-hires-properly-715405", "name": "NEW GAME! Episode 7", "number": "7" }, { "url": "/new-game/episode-8-its-summer-break-715407", "name": "NEW GAME! Episode 8", "number": "8" }, { "url": "/new-game/episode-9-do-we-have-to-come-into-work-715409", "name": "NEW GAME! Episode 9", "number": "9" }, { "url": "/new-game/episode-10-full-time-employment-is-a-loophole-in-the-law-to-make-wages-lower-715411", "name": "NEW GAME! Episode 10", "number": "10" }, { "url": "/new-game/episode-11-there-were-leaked-pictures-of-the-game-on-the-internet-yesterday-715413", "name": "NEW GAME! Episode 11", "number": "11" }, { "url": "/new-game/episode-12-one-of-my-dreams-came-true-715415", "name": "NEW GAME! Episode 12", "number": "12" }]
        },
        {
            "name": "NEW GAME!!",
            "episodes": [{ "url": "/new-game/episode-1-of-all-the-embarrassing-things-to-be-caught-doing-742151", "name": "NEW GAME!! Episode 1", "number": "1" }, { "url": "/new-game/episode-2-this-is-just-turning-into-cos-purr-lay-742153", "name": "NEW GAME!! Episode 2", "number": "2" }, { "url": "/new-game/episode-3-ooh-im-so-embarrassed-742155", "name": "NEW GAME!! Episode 3", "number": "3" }, { "url": "/new-game/episode-4-how-dense-can-you-be-742157", "name": "NEW GAME!! Episode 4", "number": "4" }, { "url": "/new-game/episode-5-hey-dont-touch-me-there-742159", "name": "NEW GAME!! Episode 5", "number": "5" }, { "url": "/new-game/episode-6-wow-its-so-amazing-742161", "name": "NEW GAME!! Episode 6", "number": "6" }, { "url": "/new-game/episode-7-im-sensing-a-very-intense-gaze-742163", "name": "NEW GAME!! Episode 7", "number": "7" }, { "url": "/new-game/episode-8-im-telling-you-i-want-a-maid-caf-742165", "name": "NEW GAME!! Episode 8", "number": "8" }, { "url": "/new-game/episode-9-at-least-put-a-shirt-on-742167", "name": "NEW GAME!! Episode 9", "number": "9" }, { "url": "/new-game/episode-10-its-gonna-really-break-the-immersion-742169", "name": "NEW GAME!! Episode 10", "number": "10" }, { "url": "/new-game/episode-11-whats-hidden-in-your-heart-742171", "name": "NEW GAME!! Episode 11", "number": "11" }, { "url": "/new-game/episode-12-make-sure-you-buy-it-742173", "name": "NEW GAME!! Episode 12", "number": "12" }]
        },
        {
            "name": "NEW GAME! (Russian)",
            "episodes": []
        },
        {
            "name": "NEW GAME!! (Russian)",
            "episodes": []
        },
        {
            "name": "NEW GAME! (English Dub)",
            "episodes": [{ "url": "/new-game/episode-1-it-actually-feels-like-i-started-my-job-792845", "name": "NEW GAME! (English Dub) Episode 1", "number": "1" }, { "url": "/new-game/episode-2-so-this-is-an-adult-drinking-party-792846", "name": "NEW GAME! (English Dub) Episode 2", "number": "2" }, { "url": "/new-game/episode-3-what-happens-if-im-late-to-work-792847", "name": "NEW GAME! (English Dub) Episode 3", "number": "3" }, { "url": "/new-game/episode-4-the-first-paycheck-792848", "name": "NEW GAME! (English Dub) Episode 4", "number": "4" }, { "url": "/new-game/episode-5-thats-how-many-nights-we-have-to-stay-over-792850", "name": "NEW GAME! (English Dub) Episode 5", "number": "5" }, { "url": "/new-game/episode-6-like-the-release-is-canceled-792851", "name": "NEW GAME! (English Dub) Episode 6", "number": "6" }, { "url": "/new-game/episode-7-please-train-the-new-hires-properly-792855", "name": "NEW GAME! (English Dub) Episode 7", "number": "7" }, { "url": "/new-game/episode-8-its-summer-break-792857", "name": "NEW GAME! (English Dub) Episode 8", "number": "8" }, { "url": "/new-game/episode-9-do-we-have-to-come-into-work-792859", "name": "NEW GAME! (English Dub) Episode 9", "number": "9" }, { "url": "/new-game/episode-10-full-time-employment-is-a-loophole-in-the-law-to-make-wages-lower-792862", "name": "NEW GAME! (English Dub) Episode 10", "number": "10" }, { "url": "/new-game/episode-11-there-were-leaked-pictures-of-the-game-on-the-internet-yesterday-792864", "name": "NEW GAME! (English Dub) Episode 11", "number": "11" }, { "url": "/new-game/episode-12-one-of-my-dreams-came-true-792865", "name": "NEW GAME! (English Dub) Episode 12", "number": "12" }]
        },
        {
            "name": "NEW GAME!! (English Dub)",
            "episodes": [{ "url": "/new-game/episode-1-of-all-the-embarrassing-things-to-be-caught-doing-792869", "name": "NEW GAME!! (English Dub) Episode 1", "number": "1" }, { "url": "/new-game/episode-2-this-is-just-turning-into-cos-purr-lay-792870", "name": "NEW GAME!! (English Dub) Episode 2", "number": "2" }, { "url": "/new-game/episode-3-ooh-im-so-embarrassed-792872", "name": "NEW GAME!! (English Dub) Episode 3", "number": "3" }, { "url": "/new-game/episode-4-how-dense-can-you-be-792874", "name": "NEW GAME!! (English Dub) Episode 4", "number": "4" }, { "url": "/new-game/episode-5-hey-dont-touch-me-there-792876", "name": "NEW GAME!! (English Dub) Episode 5", "number": "5" }, { "url": "/new-game/episode-6-wow-its-so-amazing-792878", "name": "NEW GAME!! (English Dub) Episode 6", "number": "6" }, { "url": "/new-game/episode-7-im-sensing-a-very-intense-gaze-792880", "name": "NEW GAME!! (English Dub) Episode 7", "number": "7" }, { "url": "/new-game/episode-8-im-telling-you-i-want-a-maid-caf-792882", "name": "NEW GAME!! (English Dub) Episode 8", "number": "8" }, { "url": "/new-game/episode-9-at-least-put-a-shirt-on-792884", "name": "NEW GAME!! (English Dub) Episode 9", "number": "9" }, { "url": "/new-game/episode-10-its-gonna-really-break-the-immersion-792887", "name": "NEW GAME!! (English Dub) Episode 10", "number": "10" }, { "url": "/new-game/episode-11-whats-hidden-in-your-heart-792888", "name": "NEW GAME!! (English Dub) Episode 11", "number": "11" }, { "url": "/new-game/episode-12-make-sure-you-buy-it-792890", "name": "NEW GAME!! (English Dub) Episode 12", "number": "12" }]
        }])
});

test("CrDl getEpisodesFromUrl", async () => {

});