'use client';
// 모든 페이지 공통 머리말: 제목, 페이지 이동 탭, 표시 설정·로그인 (한 줄)
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {useGuide} from './GuideProvider.jsx';
import {Chip} from './ui.jsx';
import AccountBox from './AccountBox.jsx';
import LoginGate from './LoginGate.jsx';

const PAGES=[['/','코드·지판'],['/progression','진행']];
const LABELS=[['note','음이름'],['degree','도수']];

export default function Shell({children}){
  const g=useGuide();
  const path=(usePathname()||'/').replace(/\/$/,'')||'/';
  return (
    <div className="app">
      <header className="top">
        <h1>기타 가이드</h1>
        <nav className="tabs" aria-label="페이지">
          {PAGES.map(([href,name])=>(
            <Link key={href} href={href} className={'tab'+(path===href?' on':'')} aria-current={path===href?'page':undefined}>{name}</Link>
          ))}
        </nav>
        <details className="set">
          <summary aria-label="보기 설정">⚙</summary>
          <div className="setbody">
            <div className="seg compact" role="group" aria-label="표시 방식">
              {LABELS.map(([v,l])=><Chip key={v} k="label" v={v} on={g.label===v} onPick={g.pick}>{l}</Chip>)}
            </div>
            <div className="seg compact" role="group" aria-label="음 이름 표기">
              <Chip k="acc" v="sharp" on={!g.flat} onPick={g.pick} aria-label="샤프 표기">♯</Chip>
              <Chip k="acc" v="flat" on={g.flat} onPick={g.pick} aria-label="플랫 표기">♭</Chip>
            </div>
            <AccountBox/>
          </div>
        </details>
      </header>
      {children}
      <LoginGate/>
    </div>
  );
}
