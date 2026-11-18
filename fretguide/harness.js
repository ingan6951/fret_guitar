// UI 테스트용 가짜 DOM. index.html의 마지막 <script>를 그대로 실행한다.
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
    '#tsel [data-k="t"]':['t',['0','1','2','3']],
    '[data-k="lay"]':['lay',['adj','skip']]
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
  // 비활성 여부와 상관없이 값만 바꿔 누른다 (조합 전수 검사용)
  const click=(k,v)=>handler({target:{closest:()=>({id:'',dataset:{k,v:String(v)}})}});
  // 실제 버튼을 누른다 (비활성 버튼은 무시된다)
  const clickBtn=b=>handler({target:{closest:()=>b}});
  const flags=sel=>Object.fromEntries(document.querySelectorAll(sel).map(b=>[b.dataset.v,b.disabled]));
  const cards=()=>stubs['#cards'].innerHTML;
  const svgs=()=>(cards().match(/<svg /g)||[]).length;
  const state=()=>JSON.parse(store['fretguide.v2']);
  return {stubs,lists,click,clickBtn,flags,cards,svgs,store,state,document};
}
module.exports={boot};
