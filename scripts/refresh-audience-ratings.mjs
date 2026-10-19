// Snapshot public Rotten Tomatoes audience totals. Run manually, never on page load.
import fs from "node:fs/promises";
import catalog from "../mcuarchive/checklist.json" with { type: "json" };
const paths = {
  "p1-01":"m/iron_man","p1-02":"m/the_incredible_hulk","p1-04":"m/iron_man_2","p1-05":"m/thor","p1-07":"m/captain_america_the_first_avenger","p1-08":"m/marvels_the_avengers",
  "p2-01":"m/iron_man_3","p2-03":"m/thor_the_dark_world","p2-05":"m/captain_america_the_winter_soldier","p2-06":"m/guardians_of_the_galaxy","p2-07":"m/avengers_age_of_ultron","p2-08":"m/antman",
  "p3-01":"m/captain_america_civil_war","p3-02":"m/doctor_strange_2016","p3-03":"m/guardians_of_the_galaxy_vol_2","p3-04":"m/spider_man_homecoming","p3-05":"m/thor_ragnarok_2017","p3-06":"m/black_panther_2018","p3-07":"m/avengers_infinity_war","p3-08":"m/ant_man_and_the_wasp","p3-09":"m/captain_marvel","p3-10":"m/avengers_endgame","p3-11":"m/spider_man_far_from_home",
  "p4-01":"tv/wandavision/s01","p4-02":"tv/the_falcon_and_the_winter_soldier/s01","p4-03":"tv/loki/s01","p4-04":"m/black_widow_2021","p4-05":"tv/what_if_/s01","p4-06":"m/shang_chi_and_the_legend_of_the_ten_rings","p4-07":"m/eternals","p4-08":"tv/hawkeye/s01","p4-09":"m/spider_man_no_way_home","p4-10":"tv/moon_knight/s01","p4-11":"m/doctor_strange_in_the_multiverse_of_madness","p4-12":"tv/ms_marvel/s01","p4-13":"m/thor_love_and_thunder","p4-14":"tv/she_hulk_attorney_at_law/s01","p4-15":"m/werewolf_by_night","p4-16":"m/black_panther_wakanda_forever","p4-17":"m/the_guardians_of_the_galaxy_holiday_special","p4-groot-s1":"tv/i_am_groot/s01",
  "p5-01":"m/ant_man_and_the_wasp_quantumania","p5-02":"m/guardians_of_the_galaxy_vol_3","p5-03":"tv/secret_invasion/s01","p5-04":"tv/loki/s02","p5-05":"m/the_marvels","p5-06":"tv/what_if_/s02","p5-07":"tv/echo/s01","p5-08":"m/deadpool_and_wolverine","p5-09":"tv/agatha_all_along/s01","p5-10":"m/captain_america_brave_new_world","p5-11":"tv/daredevil_born_again/s01","p5-12":"m/thunderbolts","p5-13":"tv/ironheart/s01","p5-groot-s2":"tv/i_am_groot/s02","p5-xmen-s1":"tv/x_men_97/s01","p5-whatif-s3":"tv/what_if_/s03","p5-spiderman-s1":"tv/your_friendly_neighborhood_spider_man/s01",
  "p6-01":"m/the_fantastic_four_first_steps","p6-02":"tv/eyes_of_wakanda/s01","p6-03":"tv/marvel_zombies/s01","p6-04":"tv/wonder_man/s01","p6-05":"tv/daredevil_born_again/s02","p6-06":"m/spider_man_brand_new_day","p6-punisher":"m/the_punisher_one_last_kill","p6-xmen-s2":"tv/x_men_97/s02","p6-visionquest":"tv/visionquest/s01"
};
export function parseAudience(html) {
  const match=[...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)].find(m=>/data-json=["']mediaScorecard["']/.test(m[1]));
  if(!match)throw Error("NO_SCORECARD");
  const data=JSON.parse(match[2]);
  // Use the same All Audience population for every movie and season.
  const audience=data.overlay?.audienceAll;
  if(!audience)throw Error("NO_ALL_AUDIENCE");
  const {likedCount,notLikedCount}=audience;
  if(![likedCount,notLikedCount].every(n=>Number.isSafeInteger(n)&&n>=0))throw Error("COUNTS_UNAVAILABLE");
  const percent=Number(audience.score);
  return {liked:likedCount,notLiked:notLikedCount,percent:Number.isFinite(percent)&&percent>=0&&percent<=100?percent:null,population:"All Audience"};
}

if (process.argv[1]?.endsWith("refresh-audience-ratings.mjs")) {
  if (process.argv.includes("--apply")) {
    const rows=JSON.parse(await fs.readFile(".migration/audience-research.json","utf8"));
    for (const item of catalog.items) {
      if (!item.upcoming) {
        const row=rows.find(row=>row.id===item.id && row.title===item.title && !row.error);
        if(!row || ![row.liked,row.notLiked].every(n=>Number.isSafeInteger(n)&&n>=0)) throw Error(`Unverified audience totals: ${item.id}`);
        const {liked,notLiked,percent,population,url,checkedAt}=row;
        item.audience={source:"Rotten Tomatoes",liked,notLiked,percent,population,url,checkedAt};
      }
      delete item.community;
    }
    await fs.writeFile("mcuarchive/checklist.json",JSON.stringify(catalog,null,2)+"\n");
    console.log("Applied verified Rotten Tomatoes audience snapshots; removed Reddit data.");
    process.exit(0);
  }
  const previous = process.argv.includes("--missing") ? JSON.parse(await fs.readFile(".migration/audience-research.json", "utf8")) : [];
  const results = previous.filter(row => !row.error);
  const pending=catalog.items.filter(item=>!item.upcoming && !results.some(row => row.id === item.id));
  async function worker(){
    for(let item;(item=pending.shift());){
      const path=paths[item.id];
      const url=path?`https://www.rottentomatoes.com/${path}`:null;
      try{
        if(!url)throw Error("NO_SOURCE");
        const response=await fetch(url,{signal:AbortSignal.timeout(20000),headers:{"User-Agent":"OccasionalSites audience snapshot"}});
        if(!response.ok)throw Error(`HTTP_${response.status}`);
        const html=await response.text();
        const title=html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];
        results.push({id:item.id,title:item.title,pageTitle:title,url:response.url,...parseAudience(html),checkedAt:new Date().toISOString()});
        console.log("OK",item.id,title);
      }catch(error){results.push({id:item.id,title:item.title,url,error:error.message});console.log("MISSING",item.id,error.message,url);}
    }
  }
  await Promise.all([worker(),worker(),worker()]);
  await fs.mkdir(".migration",{recursive:true});
  await fs.writeFile(".migration/audience-research.json",JSON.stringify(results,null,2)+"\n");
  console.log("Verified",results.filter(x=>!x.error).length,"of",results.length);
}
