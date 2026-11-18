// UI 테스트용 브라우저 환경 (jsdom). 다른 import보다 먼저 불러야 한다.
import {JSDOM} from 'jsdom';

const dom=new JSDOM('<!doctype html><html><body></body></html>',{url:'http://localhost/'});
const g=globalThis;
for(const k of ['window','document','navigator','HTMLElement','Element','Node','Event','MouseEvent','KeyboardEvent','getComputedStyle','localStorage','MutationObserver','SVGElement','HTMLSelectElement','HTMLButtonElement']){
  if(!(k in g)||k==='localStorage'||k==='navigator'){
    try{ Object.defineProperty(g,k,{value:k==='getComputedStyle'?dom.window.getComputedStyle.bind(dom.window):dom.window[k],configurable:true,writable:true}); }catch(e){}
  }
}
g.IS_REACT_ACT_ENVIRONMENT=true;
