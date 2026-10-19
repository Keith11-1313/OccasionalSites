// Fetch public episode names for review. Does not change catalog/progress.
import fs from "node:fs/promises";
import catalog from "../mcuarchive/checklist.json" with {type:"json"};
const groups = new Map();
for (const item of catalog.items.filter(item=>item.episodes)) {
  const name=item.title.replace(/, season \d+$/i,"");
  if (!groups.has(name)) groups.set(name,[]);
  groups.get(name).push(item);
}
const results=[];
for (const [name,items] of groups) {
  const query=name.replace(/\.\.\.\?/,"");
  const response=await fetch(`https://api.tvmaze.com/search/shows?q=${encodeURIComponent(query)}`,{signal:AbortSignal.timeout(20000)});
  if(!response.ok)throw Error(`Search HTTP ${response.status} for ${name}`);
  const matches=await response.json();
  const expectedYear=items[0].year.match(/\d{4}/)?.[0];
  const normalized=s=>s.toLowerCase().replace(/[^a-z0-9]/g,"").replace(/^marvels/,"");
  const match=matches.find(({show})=>normalized(show.name)===normalized(name)&&show.premiered?.startsWith(expectedYear)) || matches.find(({show})=>normalized(show.name)===normalized(name));
  if(!match){console.log("No matching show:",name);continue;}
  const episodeResponse=await fetch(`https://api.tvmaze.com/shows/${match.show.id}/episodes`,{signal:AbortSignal.timeout(20000)});
  if(!episodeResponse.ok)throw Error(`Episodes HTTP ${episodeResponse.status} for ${name}`);
  const episodes=await episodeResponse.json();
  for(const item of items){
    const season=Number(item.title.match(/, season (\d+)$/i)?.[1]||1);
    const list=episodes.filter(e=>e.season===season);
    results.push({id:item.id,title:item.title,show:match.show.name,premiered:match.show.premiered,source:match.show.url,episodes:list.map(e=>({number:e.number,title:e.name,source:e.url}))});
    console.log(item.id,match.show.name,`S${season}`,`${list.length}/${item.episodes.length}`);
  }
}
await fs.mkdir(".migration",{recursive:true});
await fs.writeFile(".migration/episode-research.json",JSON.stringify(results,null,2)+"\n");
