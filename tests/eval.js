// Usage: node tests/eval.js test_pack/3_unseen_holdout_1000_bills
const fs=require('fs'),path=require('path');const {reconcile}=require('../engine.js');
const dir=process.argv[2];const P=f=>{const [h,...r]=fs.readFileSync(path.join(dir,f),'utf8').trim().split(/\r?\n/);const k=h.split(',');
 return r.map(l=>{const v=l.split(',');const o={};k.forEach((x,i)=>o[x]=['taxable_value','igst','cgst','sgst','total_tax'].includes(x)?+v[i]:v[i]);return o;});};
const pr=P('purchase_register.csv'),b2=P('gstr2b.csv'),key=P('answer_key.csv');
const got={};reconcile(pr,b2).forEach(r=>{const id=r.inBooks===false?r.b2._id:r._id;got[id]=r.status;});
const G={};key.forEach(k=>{if(k.pair_group)(G[k.pair_group]=G[k.pair_group]||[]).push(k._id);});const ok={};
for(const g in G){const s=new Set(G[g].map(i=>got[i]));ok[g]=s.has('Duplicate in books')&&(s.has('Matched')||s.has('Invoice no. format'));}
const n=key.filter(k=>k.pair_group?ok[k.pair_group]:got[k._id]===k.expected).length;
console.log(`Baseline engine: ${n}/${key.length} = ${(n/key.length*100).toFixed(1)}%`);
