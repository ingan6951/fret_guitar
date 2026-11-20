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
  {root:2, q:'min', frets:[null,null,0,2,3,1]},   // Dm,
  // 프렛을 올린 E 폼 (6번 줄 근음, 바레)
  {root:0, q:'maj', frets:[8,10,10,9,8,8]}, // C
  {root:1, q:'maj', frets:[9,11,11,10,9,9]}, // C♯
  {root:2, q:'maj', frets:[10,12,12,11,10,10]}, // D
  {root:3, q:'maj', frets:[11,13,13,12,11,11]}, // D♯
  {root:5, q:'maj', frets:[1,3,3,2,1,1]}, // F
  {root:6, q:'maj', frets:[2,4,4,3,2,2]}, // F♯
  {root:7, q:'maj', frets:[3,5,5,4,3,3]}, // G
  {root:8, q:'maj', frets:[4,6,6,5,4,4]}, // G♯
  {root:9, q:'maj', frets:[5,7,7,6,5,5]}, // A
  {root:10, q:'maj', frets:[6,8,8,7,6,6]}, // A♯
  {root:11, q:'maj', frets:[7,9,9,8,7,7]}, // B
  // 프렛을 올린 Em 폼 (6번 줄 근음, 바레)
  {root:0, q:'min', frets:[8,10,10,8,8,8]}, // Cm
  {root:1, q:'min', frets:[9,11,11,9,9,9]}, // C♯m
  {root:2, q:'min', frets:[10,12,12,10,10,10]}, // Dm
  {root:3, q:'min', frets:[11,13,13,11,11,11]}, // D♯m
  {root:5, q:'min', frets:[1,3,3,1,1,1]}, // Fm
  {root:6, q:'min', frets:[2,4,4,2,2,2]}, // F♯m
  {root:7, q:'min', frets:[3,5,5,3,3,3]}, // Gm
  {root:8, q:'min', frets:[4,6,6,4,4,4]}, // G♯m
  {root:9, q:'min', frets:[5,7,7,5,5,5]}, // Am
  {root:10, q:'min', frets:[6,8,8,6,6,6]}, // A♯m
  {root:11, q:'min', frets:[7,9,9,7,7,7]}, // Bm
  // 프렛을 올린 A 폼 (5번 줄 근음, 바레)
  {root:0, q:'maj', frets:[null,3,5,5,5,3]}, // C
  {root:1, q:'maj', frets:[null,4,6,6,6,4]}, // C♯
  {root:2, q:'maj', frets:[null,5,7,7,7,5]}, // D
  {root:3, q:'maj', frets:[null,6,8,8,8,6]}, // D♯
  {root:4, q:'maj', frets:[null,7,9,9,9,7]}, // E
  {root:5, q:'maj', frets:[null,8,10,10,10,8]}, // F
  {root:6, q:'maj', frets:[null,9,11,11,11,9]}, // F♯
  {root:7, q:'maj', frets:[null,10,12,12,12,10]}, // G
  {root:8, q:'maj', frets:[null,11,13,13,13,11]}, // G♯
  {root:10, q:'maj', frets:[null,1,3,3,3,1]}, // A♯
  {root:11, q:'maj', frets:[null,2,4,4,4,2]}, // B
  // 프렛을 올린 Am 폼 (5번 줄 근음, 바레)
  {root:0, q:'min', frets:[null,3,5,5,4,3]}, // Cm
  {root:1, q:'min', frets:[null,4,6,6,5,4]}, // C♯m
  {root:2, q:'min', frets:[null,5,7,7,6,5]}, // Dm
  {root:3, q:'min', frets:[null,6,8,8,7,6]}, // D♯m
  {root:4, q:'min', frets:[null,7,9,9,8,7]}, // Em
  {root:5, q:'min', frets:[null,8,10,10,9,8]}, // Fm
  {root:6, q:'min', frets:[null,9,11,11,10,9]}, // F♯m
  {root:7, q:'min', frets:[null,10,12,12,11,10]}, // Gm
  {root:8, q:'min', frets:[null,11,13,13,12,11]}, // G♯m
  {root:10, q:'min', frets:[null,1,3,3,2,1]}, // A♯m
  {root:11, q:'min', frets:[null,2,4,4,3,2]} // Bm
];
