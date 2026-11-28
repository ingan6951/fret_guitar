'use client';
// 들어올 때 로그인 권하기: 서버 설정이 있고, 로그인하지 않았고, 이 기기에서 건너뛴 적이 없으면 앱 위에 띄운다.
// `로그인 없이 쓰기`를 누르면 이 기기에서는 다시 띄우지 않는다(⚙ 보기 설정에서 언제든 로그인할 수 있다).
// 합주 방 링크로 들어온 사람은 바로 방에 들어가야 하므로 /room 에서는 띄우지 않는다.
import {useEffect,useState} from 'react';
import {useGuide} from './GuideProvider.jsx';
import {GoogleButton} from './AccountBox.jsx';
import {SKIP_KEY} from './useCloudSync.js';

// Google에서 돌아왔는데 실패한 경우 주소에 error_description 이 붙어 온다
function oauthError(){
  try{
    const u=new URL(window.location.href),h=new URLSearchParams(u.hash.replace(/^#/,''));
    return u.searchParams.get('error_description')||h.get('error_description')||'';
  }catch(e){ return ''; }
}

export default function LoginGate(){
  const {cloud}=useGuide();
  const [skipped,setSkipped]=useState(true); // 브라우저에서 확인하기 전에는 띄우지 않는다
  const [msg,setMsg]=useState('');
  useEffect(()=>{
    let s=false; try{ s=localStorage.getItem(SKIP_KEY)==='1'; }catch(e){}
    const err=oauthError();
    if(err){ setMsg('로그인하지 못했어요: '+err); s=false; }
    setSkipped(s||window.location.pathname.startsWith('/room'));
  },[]);
  if(!cloud||!cloud.configured||!cloud.checked||cloud.user||skipped) return null;
  const skip=()=>{ try{ localStorage.setItem(SKIP_KEY,'1'); }catch(e){} setSkipped(true); };

  return (
    <div className="gate" role="dialog" aria-modal="true" aria-labelledby="gate-h">
      <div className="gatebox">
        <h2 id="gate-h">기타 가이드</h2>
        <p className="gatelead">로그인하면 만든 진행과 설정이 휴대폰·PC 어디서나 그대로 보여요.</p>
        <GoogleButton className="chip google big" onError={setMsg}/>
        <button type="button" className="chip gateskip" data-k="skiplogin" data-v="" onClick={skip}>로그인 없이 쓰기</button>
        <p className="accthelp">로그인 없이 쓰면 이 기기에만 저장돼요. 나중에 ⚙ 보기 설정에서 로그인할 수 있어요.</p>
        {msg&&<p className="acctstat bad" role="alert">{msg}</p>}
      </div>
    </div>
  );
}
