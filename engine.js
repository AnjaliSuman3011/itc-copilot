// ITC Copilot baseline engine v2 (deterministic fallback + guardrail helpers)
function parseCSV(t){const [h,...r]=t.trim().split(/\r?\n/);const k=h.split(',');return r.map(l=>{const v=l.split(',');const o={};k.forEach((x,i)=>o[x]=isNaN(v[i])||v[i]===''?v[i]:+v[i]);return o;});}
// v2 fix 4: also strip leading zeros at the start ("0012/26-27" = "12/26-27")
const norm=s=>String(s).toUpperCase().replace(/[^A-Z0-9]/g,'').replace(/(\D)0+(\d)/g,'$1$2').replace(/^0+(?=\d)/,'');
// v2 fix 1: paise rounding is not a mismatch (tolerance ₹2 or 0.1%)
const tol=v=>Math.max(2,Math.abs(v)*0.001);
function edits(a,b){if(a.length!==b.length)return 99;let d=0;for(let i=0;i<a.length;i++)if(a[i]!==b[i])d++;return d;}
function reconcile(pr,b2){
  const used=new Set(),out=[],seen=new Map();const tt=r=>r.igst>0?'IGST':'CGST+SGST';
  const rows=[];
  // v2 fix 3: duplicates detected on the normalised invoice number
  for(const p of pr){const k=p.vendor_gstin+'|'+norm(p.invoice_no);if(seen.has(k)){rows.push({p,dup:true});continue;}seen.set(k,1);rows.push({p});}
  const idx=new Map();b2.forEach((b,j)=>{const k=b.supplier_gstin+'|'+b.invoice_no;if(!idx.has(k))idx.set(k,[]);idx.get(k).push(j);});
  const nidx=new Map();b2.forEach((b,j)=>{const k=b.supplier_gstin+'|'+norm(b.invoice_no);if(!nidx.has(k))nidx.set(k,[]);nidx.get(k).push(j);});
  const take=(list)=>{if(!list)return -1;const j=list.find(j=>!used.has(j));if(j===undefined)return -1;used.add(j);return j;};
  // pass 1 exact, pass 2 normalised  (v2 fix 2: GSTIN fallback only after all same-vendor matches are done)
  for(const r of rows){if(r.dup)continue;const j=take(idx.get(r.p.vendor_gstin+'|'+r.p.invoice_no));if(j>=0){r.j=j;r.via='exact';}}
  for(const r of rows){if(r.dup||r.j!==undefined)continue;const j=take(nidx.get(r.p.vendor_gstin+'|'+norm(r.p.invoice_no)));if(j>=0){r.j=j;r.via='fuzzy';}}
  for(const r of rows){if(r.dup||r.j!==undefined)continue;const p=r.p;
    const j=b2.findIndex((b,j)=>!used.has(j)&&norm(b.invoice_no)===norm(p.invoice_no)&&Math.abs(b.taxable_value-p.taxable_value)<=tol(p.taxable_value)&&b.supplier_gstin.slice(0,2)===String(p.vendor_gstin).slice(0,2)&&edits(b.supplier_gstin,String(p.vendor_gstin))<=2);
    if(j>=0){used.add(j);r.j=j;r.via='gstin';}}
  for(const r of rows){const p=r.p;
    if(r.dup){out.push({...p,status:'Duplicate in books',b2:null});continue;}
    if(r.j===undefined){out.push({...p,status:'Missing in 2B',b2:null});continue;}
    const b=b2[r.j];let status;
    if(r.via==='gstin')status='GSTIN mismatch';
    else if(Math.abs(b.taxable_value-p.taxable_value)>tol(p.taxable_value))status='Value mismatch';
    else if(tt(b)!==tt(p))status='Wrong tax type';
    else status=r.via==='fuzzy'?'Invoice no. format':'Matched';
    out.push({...p,status,b2:b});}
  b2.forEach((b,j)=>{if(!used.has(j))out.push({invoice_no:b.invoice_no,vendor_name:b.supplier_name,vendor_gstin:b.supplier_gstin,doc_type:b.doc_type,taxable_value:b.taxable_value,total_tax:b.total_tax,status:b.doc_type==='Credit Note'?'Credit note not booked':'Missing in books',b2:b,inBooks:false});});
  return out;
}
if(typeof module!=='undefined')module.exports={parseCSV,reconcile,norm};
