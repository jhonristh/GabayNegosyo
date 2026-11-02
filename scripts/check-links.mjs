// Run with `node scripts/check-links.mjs` when outbound HTTPS is available.
import fs from "node:fs";
const data=JSON.parse(fs.readFileSync(new URL("../data/finalLinksDatabase.json",import.meta.url)));
const entries=[...data.forms,...data.videos];
const results=[];
for (const item of entries) {
 const url=item.url;
 if (!url || /TRUNCATED|Third-party/.test(item.urlStatus)) {results.push({id:item.id,url:url||"",status:"EXCLUDED",note:item.urlStatus}); continue;}
 let status="NETWORK_ERROR",code="";
 for (const method of ["HEAD","GET"]) {
   try {
     const signal=AbortSignal.timeout(6500);
     const res=await fetch(url,{method,redirect:"follow",signal});code=res.status;
     status=res.ok?"HTTP_OK":`HTTP_${res.status}`;
     if(res.ok||![403,405,501].includes(res.status))break;
   }catch(e){ status="NETWORK_ERROR"; }
 }
 results.push({id:item.id,url,status,code});
 console.log(`${item.id} ${status} ${url}`);
}
fs.mkdirSync(new URL("../docs/",import.meta.url),{recursive:true});
fs.writeFileSync(new URL("../docs/LINK_CHECK_RESULTS.json",import.meta.url),JSON.stringify({checkedAt:new Date().toISOString(),results},null,2));
const stats=results.reduce((a,r)=>(a[r.status]=(a[r.status]||0)+1,a),{});
console.log(`Checked ${results.length}: ${JSON.stringify(stats)}. HTTP 403/network errors require manual browser verification; HTTP_OK only means the server responded successfully.`);
if(process.argv.includes("--strict") && results.some(r=>!["HTTP_OK","EXCLUDED"].includes(r.status)))process.exitCode=1;
