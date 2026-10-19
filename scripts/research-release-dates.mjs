import fs from "node:fs/promises";
import catalog from "../mcuarchive/checklist.json" with {type:"json"};
const previous=JSON.parse(await fs.readFile(".migration/release-dates.json","utf8").catch(()=>"[]"));
const results=previous.filter(row=>!row.error && !catalog.items.find(item=>item.id===row.id)?.episodes);
const pending=catalog.items.filter(item=>/^\d{4}$/.test(item.year) && !results.some(row=>row.id===item.id));
async function worker(){
  for(let item;(item=pending.shift());){
    try{
      const response=await fetch(item.audience.url,{signal:AbortSignal.timeout(20000)});
      if(!response.ok)throw Error(`HTTP_${response.status}`);
      const html=await response.text();
      const data=[...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(m=>{try{return JSON.parse(m[1]);}catch{return null;}}).find(d=>d?.releaseDate && d?.mediaType);
      const seasonDate=html.match(/data-qa="item-label">Release Date<\/rt-text>[\s\S]*?data-qa="item-value">([^<]+)<\/rt-text>/)?.[1];
      const date=item.episodes?seasonDate:data?.releaseDate;
      if(!date)throw Error("NO_RELEASE_DATE");
      results.push({id:item.id,title:item.title,date,source:response.url});
      console.log(item.id,date);
    }catch(error){results.push({id:item.id,title:item.title,error:error.message});console.log("MISSING",item.id,error.message);}
  }
}
await Promise.all([worker(),worker(),worker()]);
await fs.writeFile(".migration/release-dates.json",JSON.stringify(results,null,2)+"\n");
