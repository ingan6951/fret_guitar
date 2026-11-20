// 코드 폼 데이터. 이 파일에 적힌 폼만 화면에 나온다.
// frets: 6번 줄 → 1번 줄 순서. 숫자 = 누르는 프렛(0 = 개방현), null = 치지 않는(뮤트) 줄. 손가락 번호는 다루지 않는다.
// root: 근음 음높이(C=0 … B=11), q: 코드 종류(fretlogic.js의 QUALITIES id)
export const CHORDS=[
  // 오픈 코드 (이미지 기준)
  {root:4, q:'min', frets:[0,2,2,0,0,0]},        // Em
  {root:9, q:'min', frets:[null,0,2,2,1,0]},     // Am
  {root:0, q:'maj', frets:[null,3,2,0,1,0]},     // C
  {root:2, q:'maj', frets:[null,null,0,2,3,2]},  // D
  {root:7, q:'maj', frets:[3,2,0,0,0,3]},        // G
  {root:4, q:'maj', frets:[0,2,2,1,0,0]},        // E
  {root:9, q:'maj', frets:[null,0,2,2,2,0]},     // A
  {root:2, q:'min', frets:[null,null,0,2,3,1]}   // Dm
];
