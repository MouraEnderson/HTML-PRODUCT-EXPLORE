import crypto from 'node:crypto';
const jobs=new Map(), TTL=15*60*1000;
const clean=v=>String(v||'').trim();
const members=b=>!b?[]:Array.isArray(b.member)?b.member:Array.isArray(b.members)?b.members:Array.isArray(b.data)?b.data:Array.isArray(b)?b:[];
const oid=o=>clean(o?.id||o?.physicalid||o?.physicalId||o?.identifier);
const uniq=a=>[...new Set(a.filter(Boolean))];
function sweep(){const n=Date.now();for(const [id,j] of jobs)