const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=__dirname;
function fixture(){
 const ids=new Map(), downloads=[],timers=[];const node=id=>{if(!ids.has(id))ids.set(id,{id,value:'',textContent:'',disabled:false,files:[],children:[],append(x){this.children.push(x);},addEventListener(type,fn){this[type]=fn;}});return ids.get(id)};
 const context={document:{getElementById:node,createElement:tag=>({tag,children:[],append(...items){this.children.push(...items);},click(){downloads.push(this.download);}})},navigator:{hardwareConcurrency:8,deviceMemory:8},performance,crypto:require('node:crypto').webcrypto,TextEncoder,Uint8Array,Blob,URL:{createObjectURL:()=> 'blob:test',revokeObjectURL(){}},setTimeout:fn=>timers.push(fn),location:{reload(){}},DEVELOPMENT_IDENTITY:{builderCommit:'abc',artifact:'fixture'},StandaloneAssets:{async text(){return''},async bytes(){return new Uint8Array(1)}},BrowserFFmpeg:{async loadEmbedded(){return{dispose(){}}},async extractContactSheet(r,o){return{ppm:{width:1,height:1,pixels:new Uint8Array([1,2,3])},meta:{count:o.count,samples:[{index:0,targetSeconds:0,actualSeconds:0}]},metrics:{requestedWorkers:o.workerCount??2,workersUsed:o.workerCount??2,fallbackReason:null,extractionMs:5,mergeMs:1,wasmMemoryBytes:16,attempts:[]}}}},ContactSheetDevBridge:{render(){return{toBlob:cb=>cb(new Blob(['PNG'],{type:'image/png'}))}}}};
 context.window=context;vm.runInNewContext(fs.readFileSync(path.join(root,'harness.js'),'utf8'),context);
 node('bench-file').files=[new Blob(['synthetic'])];node('bench-count').value='12';node('bench-mode').value='2';node('bench-repeat').value='2';return{context,node,downloads};
}
test('visible test controls reject missing input and produce exact same-file mode comparisons with downloads',async()=>{
 const f=fixture();f.node('bench-file').files=[];await f.node('bench-run').click();assert.match(f.node('bench-status').textContent,/select.*synthetic/i);
 f.node('bench-file').files=[new Blob(['synthetic'])];await f.node('bench-compare').click();
 assert.match(f.node('bench-status').textContent,/matched/i);assert.equal(f.node('bench-results').children.length,4);
 assert.equal(f.node('bench-download').disabled,false);f.node('bench-download').click();assert.match(f.downloads[0],/measurements.*json/);
 const visible=f.node('bench-results').children.map(x=>x.textContent).join('\n');assert.match(visible,/Workers.*1/);assert.match(visible,/Workers.*2/);assert.match(visible,/SHA-256/);assert.match(visible,/allocated WASM/);
});
test('fallback is clearly labeled and is not reported as two-worker acceleration',async()=>{
 const f=fixture();f.context.BrowserFFmpeg.extractContactSheet=async(r,o)=>({ppm:{width:1,height:1,pixels:new Uint8Array([1,2,3])},meta:{samples:[]},metrics:{requestedWorkers:2,workersUsed:1,fallbackReason:'old core',extractionMs:1,mergeMs:0,wasmMemoryBytes:null,attempts:[]}});
 await f.node('bench-run').click();assert.match(f.node('bench-status').textContent,/fallback/i);assert.match(f.node('bench-results').children[0].textContent,/old core/);
});
test('measurement downloads distinguish selected fixtures and do not retain raw PPM in callbacks',async()=>{
 const f=fixture();const file=new Blob(['fixtureA']);file.name='fixture-a.mp4';file.lastModified=42;f.node('bench-file').files=[file];
 const blobs=[];f.context.URL.createObjectURL=blob=>{blobs.push(blob);return'blob:test'};
 await f.node('bench-run').click();f.node('bench-download').click();const report=JSON.parse(await blobs.at(-1).text());
 assert.equal(report.runs[0].inputName,'fixture-a.mp4');assert.equal(report.runs[0].inputLastModified,42);assert.match(report.runs[0].pngSha256,/^[0-9a-f]{64}$/);
 const source=fs.readFileSync(path.join(root,'harness.js'),'utf8');assert.doesNotMatch(source,/\(\) => download\(jsonBlob\(result\.meta\)/);
});
test('Compare rejects different PNG exports even when raw pixels and metadata match',async()=>{
 const f=fixture();let encodes=0;f.context.ContactSheetDevBridge.render=()=>({toBlob:cb=>cb(new Blob(['PNG-'+encodes++],{type:'image/png'}))});
 await f.node('bench-compare').click();assert.match(f.node('bench-status').textContent,/FAILED.*PNG/i);
});
