# MCU catalog research — 19 October 2026

The existing catalog already contained movies through Spider-Man: Brand New Day, plus announced Avengers films. Preserve those IDs and the original shared progress baseline. New entries are unchecked. Existing completed seasons carry their completion into their episode lists; individual episode overrides take priority.

## Added titles

| Entry | Episodes | Sources |
|---|---:|---|
| I Am Groot, season 1 | 5 | https://www.marvel.com/tv-shows/i-am-groot/1 |
| I Am Groot, season 2 | 5 | https://press.disneyplus.com/news/disney-plus-marvel-studios-i-am-groot-season-2-streaming-september-6 |
| X-Men '97, season 1 | 10 | https://www.marvel.com/tv-shows/x-men-97/1 |
| What If...?, season 3 | 8 | https://en.wikipedia.org/wiki/What_If...%3F_season_3 |
| Your Friendly Neighborhood Spider-Man, season 1 | 10 | https://video.disney.com/watch/marvel-animation-s-your-friendly-neighborhood-spider-man-all-episodes-now-streaming-on-disney-62e82b24cf23bde9f3e51fcc |
| The Punisher: One Last Kill | Special | https://thewaltdisneycompany.com/news/the-punisher-one-last-kill/ |
| X-Men '97, season 2 | 9 | https://press.disney.co.uk/news/marvel-animations-x-men-97-season-2-now-streaming-exclusively-on-disney and https://www.tvguide.com/tvshows/x-men-97/episodes-season-2/1031220177/ |
| VisionQuest | 8 | https://www.disneyplus.com/en-gb/explore/articles/marvel-visionquest |

X-Men '97 and Your Friendly Neighborhood Spider-Man are optional Marvel Animation/multiverse viewing; phase grouping here is an archive organization choice, not a claim that their events share the main MCU timeline. This remains the Marvel Studios-era archive rather than a full expansion into every legacy Marvel Television show.

VisionQuest's Disney+ schedule lists episodes 1–2 on 14 October, 3–4 on 21 October, 5–6 on 28 October, 7 on 4 November and 8 on 11 November 2026. Later episodes remain disabled until those dates. A verified complete episode list for the upcoming Your Friendly Neighborhood Spider-Man season 2 was not available from the primary sources checked, so no guessed episode list was added.

## Existing series episode counts

WandaVision 9; Falcon and the Winter Soldier 6; Loki seasons 1 and 2 each 6; What If...? seasons 1 and 2 each 9; Hawkeye 6; Moon Knight 6; Ms. Marvel 6; She-Hulk 9; Secret Invasion 6; Echo 5; Agatha All Along 9; Daredevil: Born Again seasons 1 and 2 respectively 9 and 8; Ironheart 6; Eyes of Wakanda 4; Marvel Zombies 4; Wonder Man 8.

Reference catalog: https://www.marvel.com/tv-shows

Additional checks: https://press.disneyplus.com/media-kits/she-hulk-attorney-at-law ; https://www.marvel.com/articles/tv-shows/secret-invasion-episodes-streaming-disney-plus ; https://thewaltdisneycompany.com/news/marvel-television-wonder-man/

Episode labels now show their episode number and actual title, sourced from the TVmaze public API on 19 October 2026. Each episode records its source URL; each series records `episodeSource`. Marvel Zombies retains Episode 1–4 because these are the titles published by Disney+, rather than invented subtitle names. Episode data is attributed to TVmaze under CC BY-SA, with links in the site footer. All eight added titles now use the official Marvel CDN poster-card images read from https://www.marvel.com/tv-shows on 19 October 2026. Each catalog entry records its official detail-page URL in `posterSource`. The animation detail pages include `/animation/` in their paths; the Punisher special includes `/1`. The catalog retains Disney+'s VisionQuest article as the episode schedule source.

## Rotten Tomatoes audience snapshots

All 67 released titles/seasons were checked directly on Rotten Tomatoes on 19 October 2026. The two upcoming Avengers films have no audience totals displayed.

Each catalog entry records its exact title/season source URL, retrieval timestamp, All Audience population, and the published likedCount and notLikedCount values under audience.liked and audience.notLiked. Red negative numbers mean not liked; green positive numbers mean liked. The signs and text alternatives communicate the meaning without relying on color alone. Counts are display only.

The importer reads media-scorecard-json from the public title page and explicitly selects overlay.audienceAll. It does not use the critic scores or the separate Verified Audience population. The published score percentage is retained as metadata; it is not reconstructed from the counts or used to estimate missing totals. Rotten Tomatoes can adjust its published score independently of raw totals.

Example source: https://www.rottentomatoes.com/m/iron_man — 225930 liked, 22652 not liked at retrieval. Each series uses its specific season page. Upcoming films show N/A, not zero. The prior Reddit data and source links have been removed from the catalog and page.

Run node scripts/refresh-audience-ratings.mjs to produce an ignored research file. Review title/season identities and counts, then use --apply to update the catalog. --missing retries failed entries. The importer refuses incomplete snapshots. No external rating service is called by visitors or during the normal build.

## Full release dates

64 year-only labels were replaced with full month/day/year dates on 19 October 2026. Movies use their Rotten Tomatoes release date, and series use the explicit Season Info Release Date for that season. The review module releaseDate is not a reliable season premiere field and was excluded for series. Each changed entry records releaseDateSource. Existing full-date labels were retained. Dates follow the source release convention (movie theatrical release or season premiere); they do not claim a Philippine release date. Card source links and audience labels were removed at the users request; provenance remains in the catalog.
