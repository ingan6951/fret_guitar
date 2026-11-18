// 브라우저 없이 화면 코드를 돌려보는 스모크 테스트: 모든 조합을 눌러보고 SVG가 정상으로 그려지는지 확인한다.
const fs=require('fs');
const path=require('path');
const html=fs.readFileSync(path.join(__dirname,'index.html'),'utf8');
const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(x=>x[1]);
const code=scripts[scripts.length-1];

const stubs={};
const mk=()=>({innerHTML:'',textContent:'',className:'',hidden:false,attrs:{},setAttribute(k,v){this.attrs[k]=v;},
  firstElementChild:{textContent:''},lastElementChild:{textContent:''},dataset:{v:'x'}});
let handler=null;
const document={
  querySelector:s=>stubs[s]||(stubs[s]=mk()),
  querySelectorAll:()=>Array.from({length:12},mk),
  addEventListener:(t,h)=>{ if(t==='click') handler=h; }
};
const store={};
const localStorage={getItem:k=>store[k]??null,setItem:(k,v)=>{store[k]=v;}};
new Function('document','window','localStorage',code)(document,{},localStorage);

const click=(k,v)=>handler({target:{closest:()=>({id:'',dataset:{k,v:String(v)}})}});
const fails=[];
const out=()=>stubs['#cards'].innerHTML;
let renders=0;
const qs=['maj','min','7','maj7','m7'];
for(const label of ['finger','note','degree']){
  click('label',label);
  for(const acc of ['sharp','flat']){
    click('acc',acc);
    for(const q of qs){
      click('q',q);
      for(const rs of [6,5,4,3,2,1,'all']){
        click('rs',rs);
        for(let root=0;root<12;root++){
          click('root',root);
          const h=out();
          const n=(h.match(/<svg /g)||[]).length;
          if(n<1) fails.push(`${label}/${acc}/${q}/rs${rs}/root${root}: SVG 없음`);
          const shown=Number((stubs['#count'].textContent.match(/폼 (\d+)개/)||[])[1]);
          if(shown!==n) fails.push(`${label}/${acc}/${q}/rs${rs}/root${root}: 개수 표시 ${shown} != SVG ${n}`);
          if(/undefined|NaN|null/.test(h)) fails.push(`${label}/${acc}/${q}/rs${rs}/root${root}: 이상한 값 포함 ${h.match(/.{20}(undefined|NaN|null).{20}/)?.[0]}`);
          if(!stubs['#sym'].textContent) fails.push(`코드 이름 비어 있음`);
          renders++;
        }
      }
    }
  }
}
// 음 개수: 모든 개수로 렌더하고, 표시된 개수와 SVG 수가 같은지, 빈 결과 안내가 나오는지 확인
click('label','finger'); click('acc','sharp'); click('win','all');
let emptyShown=0;
for(const nn of ['basic',1,2,3,4,5,6]){
  click('n',nn);
  for(const q of qs){
    click('q',q);
    for(const rs of [6,5,4,3,2,1,'all']){
      click('rs',rs);
      for(let root=0;root<12;root++){
        click('root',root);
        const h=out();
        const n=(h.match(/<svg /g)||[]).length;
        const shown=Number((stubs['#count'].textContent.match(/폼 (\d+)개/)||[])[1]);
        if(shown!==n) fails.push(`${nn}음/${q}/rs${rs}/root${root}: 개수 표시 ${shown} != SVG ${n}`);
        if(n===0){ emptyShown++; if(!/class="empty"/.test(h)||!/data-k="n"/.test(h)) fails.push(`${nn}음/${q}/rs${rs}/root${root}: 빈 결과 안내/버튼 없음`); }
        if(/undefined|NaN|null/.test(h)) fails.push(`${nn}음/${q}/rs${rs}/root${root}: 이상한 값 포함`);
        if(nn!=='basic'&&n>0&&!new RegExp(`${nn}음 · 베이스`).test(h)) fails.push(`${nn}음/${q}/rs${rs}/root${root}: 카드 음 개수 표시 없음`);
      }
    }
  }
}
// 사용자 예시 화면: E, 2음, 근음 줄 전체, 12~16프렛
click('n',2); click('q','maj'); click('root',4); click('rs','all');
if(!/data-v="12"/.test(stubs['#wins'].innerHTML)) fails.push('E 2음: 12–16 범위 칩이 없음');
click('win',12);
if(!/빠진 구성음: 3/.test(out())) fails.push('E 2음 12~16프렛: 빠진 구성음 안내가 없음');
click('win','all'); click('n','basic');

// 가능한 프렛 범위: 칩으로 나온 범위를 하나씩 눌러 보면 폼이 반드시 있고 개수 표시가 맞아야 한다
click('label','finger'); click('acc','sharp');
let winClicks=0;
for(const nn of ['basic',1,2,3,4]){
  click('n',nn);
  for(const q of qs){
    click('q',q);
    for(const rs of [6,5,4,3,2,1,'all']){
      click('rs',rs);
      for(let root=0;root<12;root++){
        click('win','all'); click('root',root);
        const chips=stubs['#wins'].innerHTML;
        if(!/data-v="all"/.test(chips)) fails.push('전체 칩 없음');
        if(/data-k="fpreset"|data-k="fmin"|data-k="fmax"/.test(chips)) fails.push('예전 프렛 입력 컨트롤이 남아 있음');
        const wins=[...chips.matchAll(/data-v="(\d+)"/g)].map(m=>Number(m[1]));
        for(const k of wins){
          click('win',k);
          const h=out();
          const n=(h.match(/<svg /g)||[]).length;
          const shown=Number((stubs['#count'].textContent.match(/폼 (\d+)개/)||[])[1]);
          const tag=`${nn}음/${q}/rs${rs}/root${root}/범위${k}`;
          if(n<1) fails.push(`${tag}: 목록에 나온 범위인데 폼이 없음`);
          if(shown!==n) fails.push(`${tag}: 개수 표시 ${shown} != SVG ${n}`);
          if(!new RegExp(`${k}–${k+4}프렛`).test(stubs['#count'].textContent)) fails.push(`${tag}: 범위 표시 없음`);
          if(/선택한 범위에 폼이 없어/.test(stubs['#count'].textContent)) fails.push(`${tag}: 가능한 범위인데 전체로 되돌아감`);
          winClicks++;
        }
      }
    }
  }
}
// 고른 범위가 조건을 바꾼 뒤 비어 있으면 전체로 돌아간다 (빈 화면 없음)
click('n','basic'); click('q','maj7'); click('rs',6); click('acc','sharp');
let fellCount=0;
for(let root=0;root<12;root++){
  click('win','all'); click('root',root);
  const listed=/data-v="12"/.test(stubs['#wins'].innerHTML);
  click('win',12);
  const fell=/선택한 범위에 폼이 없어/.test(stubs['#count'].textContent);
  if(listed===fell) fails.push(`되돌아감 불일치 root${root}: 목록=${listed}, 되돌아감=${fell}`);
  if((out().match(/<svg /g)||[]).length<1) fails.push(`되돌아간 뒤 폼이 없음 root${root}`);
  if(fell) fellCount++;
}
if(fellCount===0) fails.push('되돌아감 경로가 한 번도 실행되지 않음');
click('win','all');

// 옥타브 토글과 저장
click('root',4); click('q','maj'); click('rs',6); // E: 6번 줄 개방 위치라 한 옥타브 위로 올릴 수 있다
const before=out();
handler({target:{closest:()=>({id:'oct',dataset:{}})}});
if(out()===before) fails.push('옥타브 토글이 화면을 바꾸지 않음');
if(!store['fretguide.v1']) fails.push('상태가 저장되지 않음');

console.log(`화면 ${renders}개 조합 렌더 (음 개수 필터에서 빈 결과 안내 ${emptyShown}회), 범위 칩 ${winClicks}번 눌러 확인 (전체로 되돌아간 경우 ${fellCount}회), 실패 ${fails.length}개`);
if(fails.length){ fails.slice(0,20).forEach(f=>console.log(' -',f)); process.exit(1); }
