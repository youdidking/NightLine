/* Independent three-way state merge. The coordinator makes read/merge/write atomic;
   KV-only mode uses this defensively but cannot promise cross-isolate transactions. */
const copy=x=>x===undefined?undefined:structuredClone(x),same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
export function conflict(message='تنظیمات هم‌زمان تغییر کرده‌اند؛ صفحه را تازه و دوباره تلاش کنید.'){const e=Error(message);e.status=409;return e;}
function fields(base={},wanted={},current={}){const out=copy(current)||{};for(const key of new Set([...Object.keys(base||{}),...Object.keys(wanted||{})])){if(same(base?.[key],wanted?.[key]))continue;if(!same(current?.[key],base?.[key])&&!same(current?.[key],wanted?.[key]))throw conflict();if(wanted?.[key]===undefined)delete out[key];else out[key]=copy(wanted[key]);}return out;}
export function mergeCommit(current,base,wanted,events=[],now=Date.now()){
 if(!current?.auth){if(base?.auth)throw conflict();current={version:3,revision:0,users:[],logs:[],settings:{},cfApi:{},auth:null};}
 if(!base&&current.auth)throw conflict('پنل قبلاً راه‌اندازی شده است.');
 if(!base)base=copy(current);
 if(!base.auth&&current.auth)throw conflict('پنل قبلاً راه‌اندازی شده است.');
 const out={version:3,revision:(Number(current.revision)||0)+1,updatedAt:now,auth:fields(base.auth,wanted.auth,current.auth),settings:fields(base.settings,wanted.settings,current.settings),cfApi:fields(base.cfApi,wanted.cfApi,{token:'',accountId:'',accountName:'',scriptName:'',dailyLimit:100000,canEditWorkers:false,updatedAt:0,...current.cfApi})};
 const b=new Map((base.users||[]).map(u=>[u.id,u])),w=new Map((wanted.users||[]).map(u=>[u.id,u])),c=new Map((current.users||[]).map(u=>[u.id,copy(u)]));
 for(const [id,old]of b){if(!w.has(id)){const live=c.get(id);if(live){const configuration=u=>Object.fromEntries(Object.entries(u).filter(([k])=>!['usedUpBytes','usedDownBytes','connections','firstConnectedAt','lastSeenAt'].includes(k)));if(!same(configuration(live),configuration(old)))throw conflict();}c.delete(id);continue;}if(!c.has(id)){if(!same(old,w.get(id)))throw conflict('این کاربر در درخواست دیگری حذف شده است.');continue;}c.set(id,fields(old,w.get(id),c.get(id)));}
 for(const [id,u]of w)if(!b.has(id)){if(c.has(id)&&!same(c.get(id),u))throw conflict();c.set(id,copy(u));}
 out.users=[...c.values()];if(out.users.length>200)throw conflict('حداکثر ۲۰۰ کاربر مجاز است.');
 for(const key of ['uuid','trojanPassword','subToken']){const vals=out.users.map(u=>u[key]).filter(Boolean);if(new Set(vals).size!==vals.length)throw conflict('شناسهٔ تکراری کاربر در تغییر هم‌زمان؛ صفحه را تازه کنید.');}
 const day=new Date(now).toISOString().slice(0,10);out.writeStats={day,count:(current.writeStats?.day===day?Number(current.writeStats.count)||0:0)+1,lastFlushAt:now};
 out.usageHistory=wanted.resetUsageHistory?{}:copy(current.usageHistory||{});for(const key of Object.keys(out.usageHistory))if(key<new Date(now-30*86400000).toISOString().slice(0,10))delete out.usageHistory[key];
 const actors={};for(const [actor,r]of Object.entries(current.usageActors||{}))if(now-r.at<2*86400000)actors[actor]={...r};
 for(const event of [...events].sort((a,b)=>a.seq-b.seq)){
  if(!/^[a-f0-9-]{36}$/i.test(event.actor)||!Number.isSafeInteger(event.seq)||event.seq<1||!Number.isFinite(event.at)||event.at>now+60000||now-event.at>86400000)throw conflict('بستهٔ مصرف قدیمی یا نامعتبر است؛ داده برای بررسی حفظ شد.');
  const old=actors[event.actor];if(old&&event.seq<=old.seq)continue;
  if(!old&&Object.keys(actors).length>=4096)throw conflict('ظرفیت دفتر تأیید مصرف پر است؛ داده برای تلاش مجدد حفظ شد.');
  const u=c.get(event.userId);if(u){const date=new Date(event.at).toISOString().slice(0,10),h=out.usageHistory[date]||{up:0,down:0,connections:0};h.up+=event.up;h.down+=event.down;h.connections+=event.conns;out.usageHistory[date]=h;for(const key of ['up','down','conns'])if(!Number.isSafeInteger(event[key])||event[key]<0)throw conflict('مقدار مصرف نامعتبر');u.usedUpBytes=(u.usedUpBytes||0)+event.up;u.usedDownBytes=(u.usedDownBytes||0)+event.down;u.connections=(u.connections||0)+event.conns;if(!u.firstConnectedAt)u.firstConnectedAt=event.at;u.lastSeenAt=Math.max(u.lastSeenAt||0,event.at);}
  actors[event.actor]={seq:event.seq,at:now};
 }
 out.usageActors=actors;out.configRevision=(Number(current.configRevision)||0)+(JSON.stringify({auth:base.auth,settings:base.settings,cfApi:base.cfApi,users:base.users})!==JSON.stringify({auth:wanted.auth,settings:wanted.settings,cfApi:wanted.cfApi,users:wanted.users})?1:0);
 const logs=[...(wanted.logs||[]),...(wanted.resetUsageHistory?[]:(current.logs||[]))],seen=new Set();out.logs=logs.filter(x=>{const k=JSON.stringify(x);if(seen.has(k))return false;seen.add(k);return true;}).sort((a,b)=>b.ts-a.ts).slice(0,40);
 return out;
}
