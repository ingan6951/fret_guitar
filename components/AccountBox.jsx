'use client';
// 보기 설정 안의 로그인·동기화 칸. 로그인하면 진행 목록과 설정을 다른 기기에서도 같이 쓴다.
import {useState} from 'react';
import {useGuide} from './GuideProvider.jsx';

const STATUS={idle:'',sync:'맞추는 중…',saved:'동기화됨',error:'동기화하지 못했어요'};

export default function AccountBox(){
  const {cloud}=useGuide();
  const [step,setStep]=useState('form'); // form | sent
  const [email,setEmail]=useState('');
  const [code,setCode]=useState('');
  const [msg,setMsg]=useState('');
  const [wait,setWait]=useState(false);
  if(!cloud||!cloud.configured) return null;

  if(cloud.user){
    return (
      <section className="acct" aria-label="계정">
        <p className="acctwho">{cloud.email}</p>
        <p className={'acctstat'+(cloud.status==='error'?' bad':'')} role="status">{STATUS[cloud.status]}</p>
        <div className="acctrow">
          {cloud.status==='error'&&<button type="button" className="chip" data-k="sretry" onClick={cloud.retry}>다시 시도</button>}
          <button type="button" className="chip" data-k="logout" onClick={()=>{ cloud.signOut(); setStep('form'); setCode(''); setMsg(''); }}>로그아웃</button>
        </div>
        <p className="accthelp">로그아웃해도 이 기기에 저장된 내용은 남아요.</p>
      </section>
    );
  }

  const run=async(fn,ok)=>{
    setWait(true); setMsg('');
    const err=await fn();
    setWait(false);
    if(err) setMsg(err); else ok&&ok();
  };
  const send=e=>{ e.preventDefault(); run(()=>cloud.sendLink(email),()=>setStep('sent')); };
  const verify=e=>{ e.preventDefault(); run(()=>cloud.verifyCode(email,code),()=>{ setStep('form'); setCode(''); }); };

  return (
    <section className="acct" aria-label="계정">
      <p className="accth">다른 기기와 같이 쓰기</p>
      {step==='form'?(
        <form className="acctform" onSubmit={send}>
          <input className="acctin" type="email" name="email" autoComplete="email" inputMode="email" placeholder="이메일 주소"
            aria-label="이메일 주소" value={email} onChange={e=>setEmail(e.target.value)} required/>
          <button type="submit" className="chip" data-k="sendlink" disabled={wait}>{wait?'보내는 중…':'로그인 메일 받기'}</button>
        </form>
      ):(
        <form className="acctform" onSubmit={verify}>
          <p className="accthelp"><b>{email.trim()}</b>로 메일을 보냈어요. 메일의 링크를 누르거나, 메일에 있는 코드를 넣어 주세요.</p>
          <input className="acctin" type="text" name="code" autoComplete="one-time-code" inputMode="numeric" placeholder="코드"
            aria-label="로그인 코드" value={code} onChange={e=>setCode(e.target.value)}/>
          <div className="acctrow">
            <button type="submit" className="chip" data-k="verify" disabled={wait}>{wait?'확인 중…':'확인'}</button>
            <button type="button" className="chip" data-k="reemail" onClick={()=>{ setStep('form'); setCode(''); setMsg(''); }}>다른 주소로</button>
          </div>
        </form>
      )}
      {msg&&<p className="acctstat bad" role="alert">{msg}</p>}
    </section>
  );
}
