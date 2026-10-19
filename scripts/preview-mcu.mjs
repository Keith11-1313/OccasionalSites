import http from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
import { getStore } from "@netlify/blobs";
import { BlobsServer } from "@netlify/blobs/server";
import { createChecklistHandler } from "../netlify/lib/checklist.mjs";
import catalog from "../mcuarchive/checklist.json" with { type:"json" };
import initialProgress from "../netlify/data/initial-progress.json" with { type:"json" };
const blobs = new BlobsServer({directory:resolve(".netlify/preview-blobs"),token:"local-preview"});
const {port} = await blobs.start();
const handler = createChecklistHandler({catalog,initialProgress,getProgressStore:()=>getStore({name:"mcu-preview",siteID:"local",token:"local-preview",apiURL:`http://localhost:${port}`,consistency:"strong"})});
const root=resolve("dist");
http.createServer(async (req,res)=>{
  try {
    if(req.url.startsWith("/.netlify/functions/checklist")) {
      const chunks=[];for await(const chunk of req)chunks.push(chunk);
      const result=await handler(new Request("http://localhost:8888"+req.url,{method:req.method,headers:req.headers,...(req.method==="PUT"&&{body:Buffer.concat(chunks)})}));
      res.writeHead(result.status,Object.fromEntries(result.headers));res.end(await result.text());return;
    }
    let path=decodeURIComponent(new URL(req.url,"http://localhost").pathname);
    if(path.endsWith("/"))path+="index.html";
    const file=resolve(root,"."+path);
    if(!file.startsWith(root+sep)){res.writeHead(403);res.end();return;}
    const data=await readFile(file);
    res.setHeader("content-type",({".html":"text/html; charset=utf-8",".json":"application/json",".png":"image/png"})[extname(file)]||"application/octet-stream");res.end(data);
  }catch{res.writeHead(404);res.end("Not found");}
}).listen(8888,"127.0.0.1",()=>console.log("MCU local preview: http://127.0.0.1:8888/mcuarchive/"));
