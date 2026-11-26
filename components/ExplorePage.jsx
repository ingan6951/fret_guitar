'use client';
// 코드·지판 페이지: 코드 폼과 지판 음계 표를 한 곳에서 본다 (보기 전용, 진행은 진행 페이지에서)
import ChordFinder from './ChordFinder.jsx';
import NoteTable from './NoteTable.jsx';

export default function ExplorePage(){
  return (
    <main className="stage">
      <ChordFinder/>
      <section className="panel" aria-label="지판 음계">
        <h2>지판 음계</h2>
        <NoteTable/>
      </section>
    </main>
  );
}
