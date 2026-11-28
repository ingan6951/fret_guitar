'use client';
// 보기 설정 안의 로그인·동기화 칸. Google로 로그인하면 진행 목록과 설정을 다른 기기에서도 같이 쓴다.
import {useState} from 'react';
import {useGuide} from './GuideProvider.jsx';

const STATUS={idle:'',sync:'맞추는 중…',saved:'동기화됨',error:'동기화하지 못했어요'};

// Google 로그인 버튼 (들어올 때 권하는 화면과 같이 쓴다)
export function GoogleButton({className='chip google',onError}){
  const {cloud}=useGuide();
  const [wait,setWait]=useState(false);
  const go=async()=>{
    setWait(true);
    const err=await cloud.signInGoogle();
    // 성공하면 Google 화면으로 넘어가므로 여기서는 실패만 다룬다
    if(err){ setWait(false); onError&&onError(err); }
  };
  return <button type="button" className={className} data-k="google" disabled={wait} onClick={go}>{wait?'Google로 이동 중…':'Google로 로그인'}</button>;
}

export default function AccountBox(){
  const {cloud}=useGuide();
  const [msg,setMsg]=useState('');
  if(!cloud||!cloud.configured) return null;

  if(cloud.user){
    return (
      <section className="acct" aria-label="계정">
        <p className="acctwho">{cloud.email}</p>
        <p className={'acctstat'+(cloud.status==='error'?' bad':'')} role="status">{STATUS[cloud.status]}</p>
        <div className="acctrow">
          {cloud.status==='error'&&<button type="button" className="chip" data-k="sretry" onClick={cloud.retry}>다시 시도</button>}
          <button type="button" className="chip" data-k="logout" onClick={cloud.signOut}>로그아웃</button>
        </div>
        <p className="accthelp">로그아웃해도 이 기기에 저장된 내용은 남아요.</p>
      </section>
    );
  }
  return (
    <section className="acct" aria-label="계정">
      <p className="accth">다른 기기와 같이 쓰기</p>
      <GoogleButton onError={setMsg}/>
      {msg&&<p className="acctstat bad" role="alert">{msg}</p>}
    </section>
  );
}
