// UI 테스트 실행: tests/*.test.jsx를 esbuild로 묶어 node 내장 테스트 러너로 돌린다.
import {build} from 'esbuild';
import {readdirSync,mkdirSync,rmSync} from 'node:fs';
import {join,dirname} from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const tests=readdirSync(join(root,'tests')).filter(f=>f.endsWith('.test.jsx'));
// 묶은 파일은 node_modules 안에 둬야 react 등을 찾는다
const out=join(root,'node_modules','.cache','fretguide-ui');
mkdirSync(out,{recursive:true});
let failed=false;
try{
  for(const f of tests){
    const outfile=join(out,f.replace(/\.jsx$/,'.mjs'));
    await build({entryPoints:[join(root,'tests',f)],outfile,bundle:true,platform:'node',format:'esm',
      jsx:'automatic',packages:'external',absWorkingDir:root,logLevel:'warning',
      banner:{js:`import {createRequire} from 'module';const require=createRequire(import.meta.url);`}});
    const r=spawnSync(process.execPath,['--test','--test-reporter=spec',outfile],{stdio:'inherit',cwd:root});
    if(r.status!==0) failed=true;
  }
}finally{ rmSync(out,{recursive:true,force:true}); }
process.exit(failed?1:0);
