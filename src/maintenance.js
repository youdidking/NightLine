import {signSession,verifySession} from './crypto.js';
import {sha256} from './releases.js';
import {DEFAULT_SETTINGS,sanitizeSettings,appendLog} from './storage.js';
export async function makeResetBackup(state){
 const filename='nightline-before-reset-'+Date.now()+'.json';
 const backup={ok:true,version:2,nightlineBackupVersion:2,exportedAt:new Date().toISOString(),settings:state.settings,users:state.users};
 const text=JSON.stringify(backup,null,2),hash=await sha256(new TextEncoder().encode(text));
 const receipt=await signSession({sub:'reset-backup',ver:state.auth.ver||1,revision:state.revision||0,hash,filename,exp:Date.now()+600000},state.auth.secret);
 return {text,hash,filename,receipt};
}
export async function resetWithReceipt(state,body){
 if(!['settings','state'].includes(body.scope)||body.confirm!=='RESET'){const e=Error('Scope و تأیید RESET لازم است.');e.status=400;throw e;}
 const receipt=await verifySession(body.backupReceipt,state.auth.secret,state.auth.ver||1);
 if(!receipt||receipt.sub!=='reset-backup'||receipt.hash!==body.backupSha256||receipt.revision!==(state.revision||0)||body.downloadAcknowledged!==true){const e=Error('بکاپ تازه و تأیید ذخیرهٔ آن لازم است؛ دوباره بکاپ بگیرید.');e.status=409;throw e;}
 const token=state.settings.tgProxySecret;state.settings=sanitizeSettings({...DEFAULT_SETTINGS,tgProxySecret:token});
 if(body.scope==='state'){state.logs=[];state.resetUsageHistory=true;state.users=state.users.map(u=>({...u,usedUpBytes:0,usedDownBytes:0,connections:0,lastSeenAt:0}));}
 // Access identities, auth, first-use/expiry dates, user plans and cfApi are intentionally unchanged.
 appendLog(state,'admin:factory-reset',body.scope+' actor=admin sha256='+receipt.hash);
 return {filename:receipt.filename,sha256:receipt.hash};
}
