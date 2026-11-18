// 불가능한 조합의 버튼이 비활성화되는지, 비활성 버튼을 눌러도 무시되는지, 저장된 불가능 조합이 복구되는지 확인한다.
const fs=require('fs');
const path=require('path');
const html=fs.readFileSync(path.join(__dirname,'index.html'),'utf8');
const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(x=>x[1]);
const code=scripts[scripts.length-1];

function boot(initialStore){
  const stubs={},lists={};
  const mk=(k,v)=>({innerHTML:'',textContent:'',className:'',hidden:false,disabled:false,attrs:{},setAttribute(a,b){this.attrs[a]=b;},
    firstElementChild:{textContent:''},lastElementChild:{textContent:''},dataset:{k,v}});
  const defs={
    '#roots .chip':['root',Array.from({length:12},(_,i)=>String(i))],
    '[data-k="q"]':['q',['maj','min','7','maj7','m7']],
    '[data-k="rs"]':['rs',['1','2','3','4','5','6','all']],
    '#ncount [data-k="n"]':['n',['1','2','3','4','5','6','basic']]
  };
  let handler=null;
  const document={
    querySelector:s=>stubs[s]||(stubs[s]=mk()),
    querySelectorAll:s=>lists[s]||(lists[s]=(defs[s]?defs[s][1]:['x','x','x']).map(v=>mk(defs[s]?defs[s][0]:undefined,v))),
    addEventListener:(t,h)=>{ if(t==='click') handler=h; }
  };
  const store=Object.assign({},initialStore);
  const localStorage={getItem:k=>store[k]??null,setItem:(k,v)=>{store[k]=v;}};
  new Function('document','window','localStorage',code)(document,{},localStorage);
  const click=(k,v)=>handler({target:{closest:()=>({id:'',dataset:{k,v:String(v)}})}});
  const clickBtn=b=>handler({target:{closest:()=>b}});
  const flags=sel=>Object.fromEntries(document.querySelectorAll(sel).map(b=>[b.dataset.v,b.disabled]));
  const cards=()=>stubs['#cards'].innerHTML;
  const svgs=()=>(cards().match(/<svg /g)||[]).length;
  return {stubs,lists,click,clickBtn,flags,cards,svgs,store,document};
}

const fails=[];
const eq=(a,b,msg)=>{ if(JSON.stringify(a)!==JSON.stringify(b)) fails.push(`${msg}: ${JSON.stringify(a)} != ${JSON.stringify(b)}`); };

// 1) 사용자 예시: 근음 C, 코드 7, 음 개수 6 -> 베이스 5는 비활성
{
  const t=boot({});
  t.click('root',0); t.click('q','7'); t.click('rs','all'); t.click('n',6);
  eq(t.flags('[data-k="rs"]'),{1:true,2:true,3:true,4:true,5:true,6:false,all:false},'C·7·6음: 베이스 버튼 상태');
  eq(Object.values(t.flags('#roots .chip')).some(Boolean),false,'근음 버튼은 항상 활성');
  if(t.svgs()<1) fails.push('C·7·6음·전체: 폼이 없음');
  // 비활성 버튼을 눌러도 아무 일도 일어나지 않는다
  const before=t.cards();
  t.clickBtn(t.lists['[data-k="rs"]'][4]); // 베이스 5 (비활성)
  if(t.cards()!==before) fails.push('비활성 버튼을 눌렀는데 화면이 바뀜');
  eq(JSON.parse(t.store['fretguide.v1']).rs,'all','비활성 버튼 클릭 후 상태');
  // 활성 버튼(6)은 정상 동작
  t.click('rs',6);
  if(t.svgs()<1) fails.push('C·7·6음·베이스 6: 폼이 없음');
}

// 2) 베이스 5, 코드 7에서는 음 개수 6이 비활성, 1~5와 기본은 활성
{
  const t=boot({});
  t.click('q','7'); t.click('rs',5);
  eq(t.flags('#ncount [data-k="n"]'),{1:false,2:false,3:false,4:false,5:false,6:true,basic:false},'베이스 5·코드 7: 음 개수 버튼 상태');
}

// 3) 베이스 1, 음 개수 4에서는 트라이어드(Major, minor)가 비활성, 7th는 활성
{
  const t=boot({});
  t.click('q','7'); t.click('rs',1); t.click('n',4);
  eq(t.flags('[data-k="q"]'),{maj:true,min:true,7:false,maj7:false,m7:false},'베이스 1·4음: 코드 버튼 상태');
}

// 4) 어떤 상태에서든 활성 버튼만 눌러서는 빈 화면에 도달하지 않는다 (무작위로 3000번 눌러 봄)
{
  const t=boot({});
  let seed=7; const rnd=n=>{ seed=(seed*1103515245+12345)&0x7fffffff; return seed%n; };
  const groups=[['[data-k="q"]','q'],['[data-k="rs"]','rs'],['#ncount [data-k="n"]','n'],['#roots .chip','root']];
  for(let i=0;i<3000;i++){
    const [sel,k]=groups[rnd(groups.length)];
    const btns=t.document.querySelectorAll(sel).filter(b=>!b.disabled);
    const b=btns[rnd(btns.length)];
    t.click(k,b.dataset.v);
    if(t.svgs()<1) { fails.push(`무작위 ${i}번째 클릭 뒤 폼이 없음: ${t.store['fretguide.v1']}`); break; }
  }
}

// 5) 저장된 상태가 불가능한 조합이면 음 개수만 기본으로 되돌아온다
{
  const t=boot({'fretguide.v1':JSON.stringify({root:0,q:'7',rs:5,n:6,label:'finger',flat:false,octave:false,win:null})});
  if(t.svgs()<1) fails.push('불가능한 저장 상태에서 폼이 없음');
  eq(JSON.parse(t.store['fretguide.v1']).n,'basic','불가능한 저장 상태: 음 개수 복구');
  eq(JSON.parse(t.store['fretguide.v1']).rs,5,'불가능한 저장 상태: 베이스 유지');
}

console.log(`비활성화 검사 실패 ${fails.length}개`);
if(fails.length){ fails.slice(0,20).forEach(f=>console.log(' -',f)); process.exit(1); }
