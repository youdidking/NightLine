import {mergeCommit} from './state-commit.js';
/* Optional SQLite-backed Durable Object; internal binding only, never a public API. */
export class NightLineCoordinator {
 constructor(ctx){this.ctx=ctx;}
 async fetch(request){try{if(request.method!=='POST')return new Response(null,{status:405});const body=await request.json(),path=new URL(request.url).pathname;
  const result=await this.ctx.storage.transaction(async tx=>{
   if(path==='/read'){let doc=await tx.get('state');if(!doc&&body.seed?.auth){doc=body.seed;await tx.put('state',doc);}return {document:doc||null};}
   if(path==='/commit'){const current=await tx.get('state');const next=mergeCommit(current,body.base,body.wanted,body.events);await tx.put('state',next);return {document:next};}
   if(path==='/login'){
    if(!/^[a-f0-9]{64}$/.test(body.key||''))throw Error('Invalid rate key');const key='login:'+body.key,now=Date.now();let rec=await tx.get(key)||{fails:0,at:now,blockedUntil:0};
    if(body.action==='clear'){await tx.delete(key);return {allowed:true};}
    if(now-rec.at>600000&&now>=rec.blockedUntil)rec={fails:0,at:now,blockedUntil:0};
    if(body.action==='check'&&now>=rec.blockedUntil){rec.at=now;rec.attempts=(rec.attempts||0)+1;if(rec.attempts>6)rec.blockedUntil=now+600000;await tx.put(key,rec);await tx.setAlarm(now+660000);}
    if(body.action==='fail'){rec.fails++;rec.at=now;if(rec.fails>=6)rec.blockedUntil=now+600000;await tx.put(key,rec);await tx.setAlarm(now+660000);}
    return {allowed:now>=rec.blockedUntil,retrySec:Math.max(1,Math.ceil((rec.blockedUntil-now)/1000))};
   }
   throw Error('Unknown internal operation');
  });return Response.json(result);
 }catch(e){return Response.json({error:String(e.message)}, {status:e.status||500});}}
 async alarm(){const now=Date.now(),rows=await this.ctx.storage.list({prefix:'login:'});let live=false;for(const [key,r]of rows){if(now-r.at>600000&&now>=r.blockedUntil)await this.ctx.storage.delete(key);else live=true;}if(live)await this.ctx.storage.setAlarm(now+660000);}
}
export function hasCoordinator(env){return !!env?.NL_COORDINATOR?.idFromName;}
export async function coordinatorCall(env,path,body){const ns=env.NL_COORDINATOR,stub=ns.get(ns.idFromName(env.NL_STATE_ID||'nightline-state-v1'));const r=await stub.fetch('https://internal'+path,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});const data=await r.json();if(!r.ok){const e=Error(data.error||'Central storage unavailable');e.status=r.status;throw e;}return data;}
export async function centralLogin(env,ip,action){const bytes=new TextEncoder().encode('nightline-login:'+ip),hash=await crypto.subtle.digest('SHA-256',bytes),key=Array.from(new Uint8Array(hash),x=>x.toString(16).padStart(2,'0')).join('');return coordinatorCall(env,'/login',{key,action});}
