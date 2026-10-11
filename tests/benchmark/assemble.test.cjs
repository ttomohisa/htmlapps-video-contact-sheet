const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto'),zlib=require('node:zlib');
const { assemble }=require('./assemble.cjs');
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
function fixture(t){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'contact-benchmark-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 for(const dir of ['tests/benchmark','src','dist','candidate'])fs.mkdirSync(path.join(root,dir),{recursive:true});
 const template=`<!doctype html><meta http-equiv="Content-Security-Policy" content="connect-src 'none'"><body><script>\nconst APP_CONFIG=__APP_CONFIG_JSON__;\nconst BUILD_MANIFEST=__BUILD_MANIFEST_JSON__;\nconst assetBundle=__EMBEDDED_ASSET_BUNDLE_JSON__;\n</script><script>(()=>{const els={canvas:null};function ppmToCanvas(){};})();</script></body>`;
 fs.writeFileSync(path.join(root,'src/index.template.html'),template);
 const values={'__APP_CONFIG_JSON__':'{"version":"1.0.6"}','__BUILD_MANIFEST_JSON__':'{"dependencies":[{"id":"ffmpeg-wasm-builder","version":"1.3.0"}]}','__EMBEDDED_ASSET_BUNDLE_JSON__':'{"dependencies":{"ffmpeg-wasm-builder":{"assets":{}}}}'};
 let base=template;for(const[k,v]of Object.entries(values))base=base.replace(k,v);fs.writeFileSync(path.join(root,'dist/index.html'),base);
 for(const name of ['harness.js','harness.html'])fs.copyFileSync(path.join(__dirname,name),path.join(root,'tests/benchmark',name));
 const expected={builderCommit:'d'.repeat(40),officialBaseline:{artifactId:'123',artifactSha256:'a'.repeat(64)},files:{}};
 for(const[name,bytes]of [['ffmpeg.js',Buffer.from('function createFFmpegCore(){}')],['ffmpeg.wasm',Buffer.from([0,97,115,109,1,0,0,0])]]){
  fs.writeFileSync(path.join(root,'candidate',name),bytes);fs.writeFileSync(path.join(root,'candidate',name+'.gz'),zlib.gzipSync(bytes));expected.files[name]={bytes:bytes.length,sha256:hash(bytes)};
 }
 const manifest={profile:'video-contact-sheet',runtime:{threading:'single-thread',requiresSharedArrayBuffer:false,requiresCrossOriginIsolation:false,workerFsInput:true},capabilities:{partitionSampling:true,maxPartitionCount:2},files:expected.files};
 const write=(file,obj)=>fs.writeFileSync(path.join(root,file),JSON.stringify(obj));write('candidate/manifest.json',manifest);write('tests/benchmark/expected-core.json',expected);
 return{root,expected,manifest,write,options:{root,builderDir:path.join(root,'candidate'),builderCommit:expected.builderCommit,workflowRunId:'456'},output:path.join(root,'dist/benchmark.html')};
}
test('source-only generator verifies the profile and emits only a labeled dist harness with actual hashes',t=>{
 const f=fixture(t);assert.equal(typeof assemble,'function');const result=assemble(f.options);const html=fs.readFileSync(f.output,'utf8');
 assert.match(html,/CI candidate \/ test-only/);assert.match(html,/id="bench-compare"/);assert.match(html,/ContactSheetDevBridge/);assert.match(html,/connect-src 'none'/);
 assert.equal(result.provenance,'reproduced-single-profile-ci');assert.equal(result.builderCommit,f.expected.builderCommit);assert.equal(result.workflowRunId,'456');assert.equal(result.officialBaseline.artifactId,'123');assert.equal(result.harnessSha256,hash(Buffer.from(html)));
 const assets=JSON.parse(html.match(/^const assetBundle=(.*);$/m)[1]).dependencies['ffmpeg-wasm-builder'].assets;
 for(const[key,name]of [['core-js','ffmpeg.js'],['core-wasm','ffmpeg.wasm']])assert.equal(hash(zlib.gunzipSync(Buffer.from(assets[key].base64,'base64'))),f.expected.files[name].sha256);
 assert.equal(fs.readFileSync(path.join(f.root,'dist/index.html'),'utf8').includes('bench-run'),false);
 assert.equal(fs.existsSync(path.join(f.root,'tests/benchmark/index.benchmark.html')),false);
});
for(const[label,mutate]of [
 ['wrong Builder commit',f=>f.options.builderCommit='e'.repeat(40)],
 ['missing workflow run identity',f=>f.options.workflowRunId=''],
 ['wrong profile',f=>{f.manifest.profile='video-compressor';f.write('candidate/manifest.json',f.manifest)}],
 ['missing partition capability',f=>{delete f.manifest.capabilities.partitionSampling;f.write('candidate/manifest.json',f.manifest)}],
 ['unbounded partition capability',f=>{f.manifest.capabilities.maxPartitionCount=3;f.write('candidate/manifest.json',f.manifest)}],
 ['pthread variant',f=>{f.manifest.runtime.threading='multi-thread';f.write('candidate/manifest.json',f.manifest)}],
 ['SharedArrayBuffer requirement',f=>{f.manifest.runtime.requiresSharedArrayBuffer=true;f.write('candidate/manifest.json',f.manifest)}],
 ['isolation requirement',f=>{f.manifest.runtime.requiresCrossOriginIsolation=true;f.write('candidate/manifest.json',f.manifest)}],
 ['missing WORKERFS',f=>{f.manifest.runtime.workerFsInput=false;f.write('candidate/manifest.json',f.manifest)}],
 ['changed raw JS',f=>fs.appendFileSync(path.join(f.root,'candidate/ffmpeg.js'),'changed')],
 ['changed WASM',f=>fs.appendFileSync(path.join(f.root,'candidate/ffmpeg.wasm'),'changed')],
 ['mismatched compressed core',f=>fs.writeFileSync(path.join(f.root,'candidate/ffmpeg.wasm.gz'),zlib.gzipSync(Buffer.from('wrong')))],
 ['untrusted manifest core hash',f=>{f.manifest.files['ffmpeg.wasm'].sha256='0'.repeat(64);f.write('candidate/manifest.json',f.manifest)}],
 ['stale source assembly',f=>fs.appendFileSync(path.join(f.root,'src/index.template.html'),'changed')]
])test(`generator rejects ${label} before creating output`,t=>{const f=fixture(t);mutate(f);assert.equal(typeof assemble,'function');assert.throws(()=>assemble(f.options));assert.equal(fs.existsSync(f.output),false);});
test('verify-only validation needs no app build and emits no HTML',t=>{
 const f=fixture(t);fs.rmSync(path.join(f.root,'dist/index.html'));const {verifyCore}=require('./assemble.cjs');const result=verifyCore(f.options);
 assert.equal(result.identity.builderCommit,f.expected.builderCommit);assert.equal(fs.existsSync(f.output),false);
});
