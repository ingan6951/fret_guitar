// 모든 근음·코드·베이스·구성음 조합을 눌러 보며 화면이 깨지지 않는지, 설정이 저장·복원되는지 확인한다.
const {boot}=require('./harness');
const fails=[];
const eq=(a,b,msg)=>{ if(JSON.stringify(a)!==JSON.stringify(b)) fails.push(`${msg}: ${JSON.stringify(a)} != ${JSON.stringify(b)}`); };

let n=0;
{
  const t=boot({});
  ['finger','note','degree'].forEach(label=>{
    t.click('label',label);
    ['sharp','flat'].forEach(acc=>{
      t.click('acc',acc);
      ['maj','min','7','maj7','m7'].forEach(q=>{
        t.click('q',q);
        for(let mask=1;mask<16;mask++){
          [0,1,2,3].forEach(i=>{
            const want=!!(mask&(1<<i));
            if(t.state().t[i]!==want) t.click('t',i);
          });
          ['adj','skip'].forEach(lay=>{
            t.click('lay',lay);
            ['1','2','3','4','5','6','all'].forEach(rs=>{
              t.click('rs',rs);
              for(let r=0;r<12;r++){ t.click('root',r); n++; }
            });
          });
        }
      });
    });
  });
}
// 옥타브
{
  const t=boot({});
  t.click('q','m7'); t.click('root',4); t.click('rs',6);
  const before=t.cards();
  t.stubs['#oct']; // 옥타브 토글
  t.clickBtn({id:'oct',disabled:false,dataset:{}});
  eq(t.state().octave,true,'옥타브 토글');
  if(t.cards()===before) fails.push('옥타브를 켰는데 화면이 그대로');
}
// 저장 후 복원
{
  const a=boot({});
  a.click('root',2); a.click('q','7'); a.click('rs',5); a.click('t',0); a.click('label','degree'); a.click('acc','flat'); a.click('lay','skip');
  const saved=a.state();
  const b=boot({'fretguide.v2':a.store['fretguide.v2']});
  eq(b.state(),saved,'저장한 설정 복원');
  eq(saved.t,[false,true,true,true],'구성음 저장');
  eq(saved.layout,'skip','줄 배치 저장');
}
// 이전 버전 저장값(구성음 정보 없음)은 기본값으로 안전하게 열린다
{
  const t=boot({'fretguide.v2':JSON.stringify({root:3,q:'maj',rs:4,n:5})});
  eq(t.state().t,[true,true,true,true],'구성음 정보 없는 저장값');
  if(t.svgs()<1) fails.push('옛 저장값에서 폼이 비어 있음');
}

console.log(`${n}개 조합 클릭`);
if(fails.length){ console.log(`실패 ${fails.length}건`); fails.slice(0,20).forEach(f=>console.log(' -',f)); process.exit(1); }
console.log('모든 검사 통과');
