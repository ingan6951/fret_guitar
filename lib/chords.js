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
  {root:11, q:'min', frets:[null,2,4,4,3,2]}, // Bm
  // 7 코드: 오픈 폼, 그 뒤 프렛을 올린 바레 폼
  {root:9, q:'7', frets:[null,0,2,0,2,0]}, // A7 오픈
  {root:4, q:'7', frets:[0,2,0,1,0,0]}, // E7 오픈
  {root:2, q:'7', frets:[null,null,0,2,1,2]}, // D7 오픈
  {root:7, q:'7', frets:[3,2,0,0,0,1]}, // G7 오픈
  {root:11, q:'7', frets:[null,2,1,2,0,2]}, // B7 오픈
  {root:0, q:'7', frets:[8,10,8,9,8,8]}, // C7 E 모양 바레
  {root:1, q:'7', frets:[9,11,9,10,9,9]}, // C♯7 E 모양 바레
  {root:2, q:'7', frets:[10,12,10,11,10,10]}, // D7 E 모양 바레
  {root:3, q:'7', frets:[11,13,11,12,11,11]}, // D♯7 E 모양 바레
  {root:5, q:'7', frets:[1,3,1,2,1,1]}, // F7 E 모양 바레
  {root:6, q:'7', frets:[2,4,2,3,2,2]}, // F♯7 E 모양 바레
  {root:7, q:'7', frets:[3,5,3,4,3,3]}, // G7 E 모양 바레
  {root:8, q:'7', frets:[4,6,4,5,4,4]}, // G♯7 E 모양 바레
  {root:9, q:'7', frets:[5,7,5,6,5,5]}, // A7 E 모양 바레
  {root:10, q:'7', frets:[6,8,6,7,6,6]}, // A♯7 E 모양 바레
  {root:11, q:'7', frets:[7,9,7,8,7,7]}, // B7 E 모양 바레
  {root:0, q:'7', frets:[null,3,5,3,5,3]}, // C7 A 모양 바레
  {root:1, q:'7', frets:[null,4,6,4,6,4]}, // C♯7 A 모양 바레
  {root:2, q:'7', frets:[null,5,7,5,7,5]}, // D7 A 모양 바레
  {root:3, q:'7', frets:[null,6,8,6,8,6]}, // D♯7 A 모양 바레
  {root:4, q:'7', frets:[null,7,9,7,9,7]}, // E7 A 모양 바레
  {root:5, q:'7', frets:[null,8,10,8,10,8]}, // F7 A 모양 바레
  {root:6, q:'7', frets:[null,9,11,9,11,9]}, // F♯7 A 모양 바레
  {root:7, q:'7', frets:[null,10,12,10,12,10]}, // G7 A 모양 바레
  {root:8, q:'7', frets:[null,11,13,11,13,11]}, // G♯7 A 모양 바레
  {root:10, q:'7', frets:[null,1,3,1,3,1]}, // A♯7 A 모양 바레
  {root:11, q:'7', frets:[null,2,4,2,4,2]}, // B7 A 모양 바레
  // m7 코드: 오픈 폼, 그 뒤 프렛을 올린 바레 폼
  {root:9, q:'m7', frets:[null,0,2,0,1,0]}, // Am7 오픈
  {root:4, q:'m7', frets:[0,2,0,0,0,0]}, // Em7 오픈
  {root:2, q:'m7', frets:[null,null,0,2,1,1]}, // Dm7 오픈
  {root:11, q:'m7', frets:[null,2,0,2,0,2]}, // Bm7 오픈
  {root:0, q:'m7', frets:[8,10,8,8,8,8]}, // Cm7 E 모양 바레
  {root:1, q:'m7', frets:[9,11,9,9,9,9]}, // C♯m7 E 모양 바레
  {root:2, q:'m7', frets:[10,12,10,10,10,10]}, // Dm7 E 모양 바레
  {root:3, q:'m7', frets:[11,13,11,11,11,11]}, // D♯m7 E 모양 바레
  {root:5, q:'m7', frets:[1,3,1,1,1,1]}, // Fm7 E 모양 바레
  {root:6, q:'m7', frets:[2,4,2,2,2,2]}, // F♯m7 E 모양 바레
  {root:7, q:'m7', frets:[3,5,3,3,3,3]}, // Gm7 E 모양 바레
  {root:8, q:'m7', frets:[4,6,4,4,4,4]}, // G♯m7 E 모양 바레
  {root:9, q:'m7', frets:[5,7,5,5,5,5]}, // Am7 E 모양 바레
  {root:10, q:'m7', frets:[6,8,6,6,6,6]}, // A♯m7 E 모양 바레
  {root:11, q:'m7', frets:[7,9,7,7,7,7]}, // Bm7 E 모양 바레
  {root:0, q:'m7', frets:[null,3,5,3,4,3]}, // Cm7 A 모양 바레
  {root:1, q:'m7', frets:[null,4,6,4,5,4]}, // C♯m7 A 모양 바레
  {root:2, q:'m7', frets:[null,5,7,5,6,5]}, // Dm7 A 모양 바레
  {root:3, q:'m7', frets:[null,6,8,6,7,6]}, // D♯m7 A 모양 바레
  {root:4, q:'m7', frets:[null,7,9,7,8,7]}, // Em7 A 모양 바레
  {root:5, q:'m7', frets:[null,8,10,8,9,8]}, // Fm7 A 모양 바레
  {root:6, q:'m7', frets:[null,9,11,9,10,9]}, // F♯m7 A 모양 바레
  {root:7, q:'m7', frets:[null,10,12,10,11,10]}, // Gm7 A 모양 바레
  {root:8, q:'m7', frets:[null,11,13,11,12,11]}, // G♯m7 A 모양 바레
  {root:10, q:'m7', frets:[null,1,3,1,2,1]}, // A♯m7 A 모양 바레
  {root:11, q:'m7', frets:[null,2,4,2,3,2]}, // Bm7 A 모양 바레
  // maj7 코드: 오픈 폼, 그 뒤 프렛을 올린 바레 폼
  {root:0, q:'maj7', frets:[null,3,2,0,0,0]}, // Cmaj7 오픈
  {root:9, q:'maj7', frets:[null,0,2,1,2,0]}, // Amaj7 오픈
  {root:2, q:'maj7', frets:[null,null,0,2,2,2]}, // Dmaj7 오픈
  {root:7, q:'maj7', frets:[3,2,0,0,0,2]}, // Gmaj7 오픈
  {root:4, q:'maj7', frets:[0,2,1,1,0,0]}, // Emaj7 오픈
  {root:5, q:'maj7', frets:[null,null,3,2,1,0]}, // Fmaj7 오픈
  {root:0, q:'maj7', frets:[8,10,9,9,8,8]}, // Cmaj7 E 모양 바레
  {root:1, q:'maj7', frets:[9,11,10,10,9,9]}, // C♯maj7 E 모양 바레
  {root:2, q:'maj7', frets:[10,12,11,11,10,10]}, // Dmaj7 E 모양 바레
  {root:3, q:'maj7', frets:[11,13,12,12,11,11]}, // D♯maj7 E 모양 바레
  {root:5, q:'maj7', frets:[1,3,2,2,1,1]}, // Fmaj7 E 모양 바레
  {root:6, q:'maj7', frets:[2,4,3,3,2,2]}, // F♯maj7 E 모양 바레
  {root:7, q:'maj7', frets:[3,5,4,4,3,3]}, // Gmaj7 E 모양 바레
  {root:8, q:'maj7', frets:[4,6,5,5,4,4]}, // G♯maj7 E 모양 바레
  {root:9, q:'maj7', frets:[5,7,6,6,5,5]}, // Amaj7 E 모양 바레
  {root:10, q:'maj7', frets:[6,8,7,7,6,6]}, // A♯maj7 E 모양 바레
  {root:11, q:'maj7', frets:[7,9,8,8,7,7]}, // Bmaj7 E 모양 바레
  {root:0, q:'maj7', frets:[null,3,5,4,5,3]}, // Cmaj7 A 모양 바레
  {root:1, q:'maj7', frets:[null,4,6,5,6,4]}, // C♯maj7 A 모양 바레
  {root:2, q:'maj7', frets:[null,5,7,6,7,5]}, // Dmaj7 A 모양 바레
  {root:3, q:'maj7', frets:[null,6,8,7,8,6]}, // D♯maj7 A 모양 바레
  {root:4, q:'maj7', frets:[null,7,9,8,9,7]}, // Emaj7 A 모양 바레
  {root:5, q:'maj7', frets:[null,8,10,9,10,8]}, // Fmaj7 A 모양 바레
  {root:6, q:'maj7', frets:[null,9,11,10,11,9]}, // F♯maj7 A 모양 바레
  {root:7, q:'maj7', frets:[null,10,12,11,12,10]}, // Gmaj7 A 모양 바레
  {root:8, q:'maj7', frets:[null,11,13,12,13,11]}, // G♯maj7 A 모양 바레
  {root:10, q:'maj7', frets:[null,1,3,2,3,1]}, // A♯maj7 A 모양 바레
  {root:11, q:'maj7', frets:[null,2,4,3,4,2]}, // Bmaj7 A 모양 바레
  // sus4 코드: 오픈 폼, 그 뒤 프렛을 올린 바레 폼
  {root:9, q:'sus4', frets:[null,0,2,2,3,0]}, // Asus4 오픈
  {root:2, q:'sus4', frets:[null,null,0,2,3,3]}, // Dsus4 오픈
  {root:4, q:'sus4', frets:[0,2,2,2,0,0]}, // Esus4 오픈
  {root:0, q:'sus4', frets:[null,3,3,0,1,1]}, // Csus4 오픈
  {root:7, q:'sus4', frets:[3,3,0,0,1,3]}, // Gsus4 오픈
  {root:0, q:'sus4', frets:[8,10,10,10,8,8]}, // Csus4 E 모양 바레
  {root:1, q:'sus4', frets:[9,11,11,11,9,9]}, // C♯sus4 E 모양 바레
  {root:2, q:'sus4', frets:[10,12,12,12,10,10]}, // Dsus4 E 모양 바레
  {root:3, q:'sus4', frets:[11,13,13,13,11,11]}, // D♯sus4 E 모양 바레
  {root:5, q:'sus4', frets:[1,3,3,3,1,1]}, // Fsus4 E 모양 바레
  {root:6, q:'sus4', frets:[2,4,4,4,2,2]}, // F♯sus4 E 모양 바레
  {root:7, q:'sus4', frets:[3,5,5,5,3,3]}, // Gsus4 E 모양 바레
  {root:8, q:'sus4', frets:[4,6,6,6,4,4]}, // G♯sus4 E 모양 바레
  {root:9, q:'sus4', frets:[5,7,7,7,5,5]}, // Asus4 E 모양 바레
  {root:10, q:'sus4', frets:[6,8,8,8,6,6]}, // A♯sus4 E 모양 바레
  {root:11, q:'sus4', frets:[7,9,9,9,7,7]}, // Bsus4 E 모양 바레
  {root:0, q:'sus4', frets:[null,3,5,5,6,3]}, // Csus4 A 모양 바레
  {root:1, q:'sus4', frets:[null,4,6,6,7,4]}, // C♯sus4 A 모양 바레
  {root:2, q:'sus4', frets:[null,5,7,7,8,5]}, // Dsus4 A 모양 바레
  {root:3, q:'sus4', frets:[null,6,8,8,9,6]}, // D♯sus4 A 모양 바레
  {root:4, q:'sus4', frets:[null,7,9,9,10,7]}, // Esus4 A 모양 바레
  {root:5, q:'sus4', frets:[null,8,10,10,11,8]}, // Fsus4 A 모양 바레
  {root:6, q:'sus4', frets:[null,9,11,11,12,9]}, // F♯sus4 A 모양 바레
  {root:7, q:'sus4', frets:[null,10,12,12,13,10]}, // Gsus4 A 모양 바레
  {root:8, q:'sus4', frets:[null,11,13,13,14,11]}, // G♯sus4 A 모양 바레
  {root:10, q:'sus4', frets:[null,1,3,3,4,1]}, // A♯sus4 A 모양 바레
  {root:11, q:'sus4', frets:[null,2,4,4,5,2]}, // Bsus4 A 모양 바레
  // sus2 코드: 오픈 폼, 그 뒤 프렛을 올린 바레 폼
  {root:9, q:'sus2', frets:[null,0,2,2,0,0]}, // Asus2 오픈
  {root:2, q:'sus2', frets:[null,null,0,2,3,0]}, // Dsus2 오픈
  {root:0, q:'sus2', frets:[null,3,0,0,3,3]}, // Csus2 오픈
  {root:7, q:'sus2', frets:[3,0,0,0,3,3]}, // Gsus2 오픈
  {root:0, q:'sus2', frets:[null,3,5,5,3,3]}, // Csus2 A 모양 바레
  {root:1, q:'sus2', frets:[null,4,6,6,4,4]}, // C♯sus2 A 모양 바레
  {root:2, q:'sus2', frets:[null,5,7,7,5,5]}, // Dsus2 A 모양 바레
  {root:3, q:'sus2', frets:[null,6,8,8,6,6]}, // D♯sus2 A 모양 바레
  {root:4, q:'sus2', frets:[null,7,9,9,7,7]}, // Esus2 A 모양 바레
  {root:5, q:'sus2', frets:[null,8,10,10,8,8]}, // Fsus2 A 모양 바레
  {root:6, q:'sus2', frets:[null,9,11,11,9,9]}, // F♯sus2 A 모양 바레
  {root:7, q:'sus2', frets:[null,10,12,12,10,10]}, // Gsus2 A 모양 바레
  {root:8, q:'sus2', frets:[null,11,13,13,11,11]}, // G♯sus2 A 모양 바레
  {root:10, q:'sus2', frets:[null,1,3,3,1,1]}, // A♯sus2 A 모양 바레
  {root:11, q:'sus2', frets:[null,2,4,4,2,2]}, // Bsus2 A 모양 바레
  // add9 코드: 오픈 폼, 그 뒤 프렛을 올린 바레 폼
  {root:0, q:'add9', frets:[null,3,2,0,3,0]}, // Cadd9 오픈
  {root:7, q:'add9', frets:[3,0,0,2,0,3]}, // Gadd9 오픈
  {root:9, q:'add9', frets:[null,0,2,4,2,0]}, // Aadd9 오픈
  {root:4, q:'add9', frets:[0,2,2,1,0,2]}, // Eadd9 오픈,
  // 6 코드: 오픈 폼이 있으면 먼저, 그 뒤 프렛을 올린 폼
  {root:4, q:'6', frets:[0,2,2,1,2,0]}, // E6 오픈 E 모양
  {root:9, q:'6', frets:[null,0,2,2,2,2]}, // A6 오픈 A 모양
  {root:0, q:'6', frets:[8,10,10,9,10,8]}, // C6 E 모양 바레
  {root:1, q:'6', frets:[9,11,11,10,11,9]}, // C♯6 E 모양 바레
  {root:2, q:'6', frets:[10,12,12,11,12,10]}, // D6 E 모양 바레
  {root:3, q:'6', frets:[11,13,13,12,13,11]}, // D♯6 E 모양 바레
  {root:5, q:'6', frets:[1,3,3,2,3,1]}, // F6 E 모양 바레
  {root:6, q:'6', frets:[2,4,4,3,4,2]}, // F♯6 E 모양 바레
  {root:7, q:'6', frets:[3,5,5,4,5,3]}, // G6 E 모양 바레
  {root:8, q:'6', frets:[4,6,6,5,6,4]}, // G♯6 E 모양 바레
  {root:9, q:'6', frets:[5,7,7,6,7,5]}, // A6 E 모양 바레
  {root:10, q:'6', frets:[6,8,8,7,8,6]}, // A♯6 E 모양 바레
  {root:11, q:'6', frets:[7,9,9,8,9,7]}, // B6 E 모양 바레
  {root:0, q:'6', frets:[null,3,5,5,5,5]}, // C6 A 모양 바레
  {root:1, q:'6', frets:[null,4,6,6,6,6]}, // C♯6 A 모양 바레
  {root:2, q:'6', frets:[null,5,7,7,7,7]}, // D6 A 모양 바레
  {root:3, q:'6', frets:[null,6,8,8,8,8]}, // D♯6 A 모양 바레
  {root:4, q:'6', frets:[null,7,9,9,9,9]}, // E6 A 모양 바레
  {root:5, q:'6', frets:[null,8,10,10,10,10]}, // F6 A 모양 바레
  {root:6, q:'6', frets:[null,9,11,11,11,11]}, // F♯6 A 모양 바레
  {root:7, q:'6', frets:[null,10,12,12,12,12]}, // G6 A 모양 바레
  {root:8, q:'6', frets:[null,11,13,13,13,13]}, // G♯6 A 모양 바레
  {root:10, q:'6', frets:[null,1,3,3,3,3]}, // A♯6 A 모양 바레
  {root:11, q:'6', frets:[null,2,4,4,4,4]}, // B6 A 모양 바레
  // m6 코드: 오픈 폼이 있으면 먼저, 그 뒤 프렛을 올린 폼
  {root:4, q:'m6', frets:[0,2,2,0,2,0]}, // Em6 오픈 E 모양
  {root:9, q:'m6', frets:[null,0,2,2,1,2]}, // Am6 오픈 A 모양
  {root:0, q:'m6', frets:[8,10,10,8,10,8]}, // Cm6 E 모양 바레
  {root:1, q:'m6', frets:[9,11,11,9,11,9]}, // C♯m6 E 모양 바레
  {root:2, q:'m6', frets:[10,12,12,10,12,10]}, // Dm6 E 모양 바레
  {root:3, q:'m6', frets:[11,13,13,11,13,11]}, // D♯m6 E 모양 바레
  {root:5, q:'m6', frets:[1,3,3,1,3,1]}, // Fm6 E 모양 바레
  {root:6, q:'m6', frets:[2,4,4,2,4,2]}, // F♯m6 E 모양 바레
  {root:7, q:'m6', frets:[3,5,5,3,5,3]}, // Gm6 E 모양 바레
  {root:8, q:'m6', frets:[4,6,6,4,6,4]}, // G♯m6 E 모양 바레
  {root:9, q:'m6', frets:[5,7,7,5,7,5]}, // Am6 E 모양 바레
  {root:10, q:'m6', frets:[6,8,8,6,8,6]}, // A♯m6 E 모양 바레
  {root:11, q:'m6', frets:[7,9,9,7,9,7]}, // Bm6 E 모양 바레
  {root:0, q:'m6', frets:[null,3,5,5,4,5]}, // Cm6 A 모양 바레
  {root:1, q:'m6', frets:[null,4,6,6,5,6]}, // C♯m6 A 모양 바레
  {root:2, q:'m6', frets:[null,5,7,7,6,7]}, // Dm6 A 모양 바레
  {root:3, q:'m6', frets:[null,6,8,8,7,8]}, // D♯m6 A 모양 바레
  {root:4, q:'m6', frets:[null,7,9,9,8,9]}, // Em6 A 모양 바레
  {root:5, q:'m6', frets:[null,8,10,10,9,10]}, // Fm6 A 모양 바레
  {root:6, q:'m6', frets:[null,9,11,11,10,11]}, // F♯m6 A 모양 바레
  {root:7, q:'m6', frets:[null,10,12,12,11,12]}, // Gm6 A 모양 바레
  {root:8, q:'m6', frets:[null,11,13,13,12,13]}, // G♯m6 A 모양 바레
  {root:10, q:'m6', frets:[null,1,3,3,2,3]}, // A♯m6 A 모양 바레
  {root:11, q:'m6', frets:[null,2,4,4,3,4]}, // Bm6 A 모양 바레
  // 7sus4 코드: 오픈 폼이 있으면 먼저, 그 뒤 프렛을 올린 폼
  {root:4, q:'7sus4', frets:[0,2,0,2,0,0]}, // E7sus4 오픈 E 모양
  {root:9, q:'7sus4', frets:[null,0,2,0,3,0]}, // A7sus4 오픈 A 모양
  {root:0, q:'7sus4', frets:[8,10,8,10,8,8]}, // C7sus4 E 모양 바레
  {root:1, q:'7sus4', frets:[9,11,9,11,9,9]}, // C♯7sus4 E 모양 바레
  {root:2, q:'7sus4', frets:[10,12,10,12,10,10]}, // D7sus4 E 모양 바레
  {root:3, q:'7sus4', frets:[11,13,11,13,11,11]}, // D♯7sus4 E 모양 바레
  {root:5, q:'7sus4', frets:[1,3,1,3,1,1]}, // F7sus4 E 모양 바레
  {root:6, q:'7sus4', frets:[2,4,2,4,2,2]}, // F♯7sus4 E 모양 바레
  {root:7, q:'7sus4', frets:[3,5,3,5,3,3]}, // G7sus4 E 모양 바레
  {root:8, q:'7sus4', frets:[4,6,4,6,4,4]}, // G♯7sus4 E 모양 바레
  {root:9, q:'7sus4', frets:[5,7,5,7,5,5]}, // A7sus4 E 모양 바레
  {root:10, q:'7sus4', frets:[6,8,6,8,6,6]}, // A♯7sus4 E 모양 바레
  {root:11, q:'7sus4', frets:[7,9,7,9,7,7]}, // B7sus4 E 모양 바레
  {root:0, q:'7sus4', frets:[null,3,5,3,6,3]}, // C7sus4 A 모양 바레
  {root:1, q:'7sus4', frets:[null,4,6,4,7,4]}, // C♯7sus4 A 모양 바레
  {root:2, q:'7sus4', frets:[null,5,7,5,8,5]}, // D7sus4 A 모양 바레
  {root:3, q:'7sus4', frets:[null,6,8,6,9,6]}, // D♯7sus4 A 모양 바레
  {root:4, q:'7sus4', frets:[null,7,9,7,10,7]}, // E7sus4 A 모양 바레
  {root:5, q:'7sus4', frets:[null,8,10,8,11,8]}, // F7sus4 A 모양 바레
  {root:6, q:'7sus4', frets:[null,9,11,9,12,9]}, // F♯7sus4 A 모양 바레
  {root:7, q:'7sus4', frets:[null,10,12,10,13,10]}, // G7sus4 A 모양 바레
  {root:8, q:'7sus4', frets:[null,11,13,11,14,11]}, // G♯7sus4 A 모양 바레
  {root:10, q:'7sus4', frets:[null,1,3,1,4,1]}, // A♯7sus4 A 모양 바레
  {root:11, q:'7sus4', frets:[null,2,4,2,5,2]}, // B7sus4 A 모양 바레
  // m(maj7) 코드: 오픈 폼이 있으면 먼저, 그 뒤 프렛을 올린 폼
  {root:4, q:'mmaj7', frets:[0,2,1,0,0,0]}, // Em(maj7) 오픈 E 모양
  {root:9, q:'mmaj7', frets:[null,0,2,1,1,0]}, // Am(maj7) 오픈 A 모양
  {root:0, q:'mmaj7', frets:[8,10,9,8,8,8]}, // Cm(maj7) E 모양 바레
  {root:1, q:'mmaj7', frets:[9,11,10,9,9,9]}, // C♯m(maj7) E 모양 바레
  {root:2, q:'mmaj7', frets:[10,12,11,10,10,10]}, // Dm(maj7) E 모양 바레
  {root:3, q:'mmaj7', frets:[11,13,12,11,11,11]}, // D♯m(maj7) E 모양 바레
  {root:5, q:'mmaj7', frets:[1,3,2,1,1,1]}, // Fm(maj7) E 모양 바레
  {root:6, q:'mmaj7', frets:[2,4,3,2,2,2]}, // F♯m(maj7) E 모양 바레
  {root:7, q:'mmaj7', frets:[3,5,4,3,3,3]}, // Gm(maj7) E 모양 바레
  {root:8, q:'mmaj7', frets:[4,6,5,4,4,4]}, // G♯m(maj7) E 모양 바레
  {root:9, q:'mmaj7', frets:[5,7,6,5,5,5]}, // Am(maj7) E 모양 바레
  {root:10, q:'mmaj7', frets:[6,8,7,6,6,6]}, // A♯m(maj7) E 모양 바레
  {root:11, q:'mmaj7', frets:[7,9,8,7,7,7]}, // Bm(maj7) E 모양 바레
  {root:0, q:'mmaj7', frets:[null,3,5,4,4,3]}, // Cm(maj7) A 모양 바레
  {root:1, q:'mmaj7', frets:[null,4,6,5,5,4]}, // C♯m(maj7) A 모양 바레
  {root:2, q:'mmaj7', frets:[null,5,7,6,6,5]}, // Dm(maj7) A 모양 바레
  {root:3, q:'mmaj7', frets:[null,6,8,7,7,6]}, // D♯m(maj7) A 모양 바레
  {root:4, q:'mmaj7', frets:[null,7,9,8,8,7]}, // Em(maj7) A 모양 바레
  {root:5, q:'mmaj7', frets:[null,8,10,9,9,8]}, // Fm(maj7) A 모양 바레
  {root:6, q:'mmaj7', frets:[null,9,11,10,10,9]}, // F♯m(maj7) A 모양 바레
  {root:7, q:'mmaj7', frets:[null,10,12,11,11,10]}, // Gm(maj7) A 모양 바레
  {root:8, q:'mmaj7', frets:[null,11,13,12,12,11]}, // G♯m(maj7) A 모양 바레
  {root:10, q:'mmaj7', frets:[null,1,3,2,2,1]}, // A♯m(maj7) A 모양 바레
  {root:11, q:'mmaj7', frets:[null,2,4,3,3,2]}, // Bm(maj7) A 모양 바레
  // dim 코드: 오픈 폼이 있으면 먼저, 그 뒤 프렛을 올린 폼
  {root:2, q:'dim', frets:[null,null,0,1,3,1]}, // Ddim 오픈 D 모양
  {root:0, q:'dim', frets:[null,null,10,11,13,11]}, // Cdim D 모양 (4번 줄 근음)
  {root:1, q:'dim', frets:[null,null,11,12,14,12]}, // C♯dim D 모양 (4번 줄 근음)
  {root:3, q:'dim', frets:[null,null,1,2,4,2]}, // D♯dim D 모양 (4번 줄 근음)
  {root:4, q:'dim', frets:[null,null,2,3,5,3]}, // Edim D 모양 (4번 줄 근음)
  {root:5, q:'dim', frets:[null,null,3,4,6,4]}, // Fdim D 모양 (4번 줄 근음)
  {root:6, q:'dim', frets:[null,null,4,5,7,5]}, // F♯dim D 모양 (4번 줄 근음)
  {root:7, q:'dim', frets:[null,null,5,6,8,6]}, // Gdim D 모양 (4번 줄 근음)
  {root:8, q:'dim', frets:[null,null,6,7,9,7]}, // G♯dim D 모양 (4번 줄 근음)
  {root:9, q:'dim', frets:[null,null,7,8,10,8]}, // Adim D 모양 (4번 줄 근음)
  {root:10, q:'dim', frets:[null,null,8,9,11,9]}, // A♯dim D 모양 (4번 줄 근음)
  {root:11, q:'dim', frets:[null,null,9,10,12,10]}, // Bdim D 모양 (4번 줄 근음)
  // dim7 코드: 오픈 폼이 있으면 먼저, 그 뒤 프렛을 올린 폼
  {root:2, q:'dim7', frets:[null,null,0,1,0,1]}, // Ddim7 오픈 D 모양
  {root:0, q:'dim7', frets:[null,null,10,11,10,11]}, // Cdim7 D 모양 (4번 줄 근음)
  {root:1, q:'dim7', frets:[null,null,11,12,11,12]}, // C♯dim7 D 모양 (4번 줄 근음)
  {root:3, q:'dim7', frets:[null,null,1,2,1,2]}, // D♯dim7 D 모양 (4번 줄 근음)
  {root:4, q:'dim7', frets:[null,null,2,3,2,3]}, // Edim7 D 모양 (4번 줄 근음)
  {root:5, q:'dim7', frets:[null,null,3,4,3,4]}, // Fdim7 D 모양 (4번 줄 근음)
  {root:6, q:'dim7', frets:[null,null,4,5,4,5]}, // F♯dim7 D 모양 (4번 줄 근음)
  {root:7, q:'dim7', frets:[null,null,5,6,5,6]}, // Gdim7 D 모양 (4번 줄 근음)
  {root:8, q:'dim7', frets:[null,null,6,7,6,7]}, // G♯dim7 D 모양 (4번 줄 근음)
  {root:9, q:'dim7', frets:[null,null,7,8,7,8]}, // Adim7 D 모양 (4번 줄 근음)
  {root:10, q:'dim7', frets:[null,null,8,9,8,9]}, // A♯dim7 D 모양 (4번 줄 근음)
  {root:11, q:'dim7', frets:[null,null,9,10,9,10]}, // Bdim7 D 모양 (4번 줄 근음)
  // m7♭5 코드: 오픈 폼이 있으면 먼저, 그 뒤 프렛을 올린 폼
  {root:2, q:'m7b5', frets:[null,null,0,1,1,1]}, // Dm7♭5 오픈 D 모양
  {root:0, q:'m7b5', frets:[null,null,10,11,11,11]}, // Cm7♭5 D 모양 (4번 줄 근음)
  {root:1, q:'m7b5', frets:[null,null,11,12,12,12]}, // C♯m7♭5 D 모양 (4번 줄 근음)
  {root:3, q:'m7b5', frets:[null,null,1,2,2,2]}, // D♯m7♭5 D 모양 (4번 줄 근음)
  {root:4, q:'m7b5', frets:[null,null,2,3,3,3]}, // Em7♭5 D 모양 (4번 줄 근음)
  {root:5, q:'m7b5', frets:[null,null,3,4,4,4]}, // Fm7♭5 D 모양 (4번 줄 근음)
  {root:6, q:'m7b5', frets:[null,null,4,5,5,5]}, // F♯m7♭5 D 모양 (4번 줄 근음)
  {root:7, q:'m7b5', frets:[null,null,5,6,6,6]}, // Gm7♭5 D 모양 (4번 줄 근음)
  {root:8, q:'m7b5', frets:[null,null,6,7,7,7]}, // G♯m7♭5 D 모양 (4번 줄 근음)
  {root:9, q:'m7b5', frets:[null,null,7,8,8,8]}, // Am7♭5 D 모양 (4번 줄 근음)
  {root:10, q:'m7b5', frets:[null,null,8,9,9,9]}, // A♯m7♭5 D 모양 (4번 줄 근음)
  {root:11, q:'m7b5', frets:[null,null,9,10,10,10]}, // Bm7♭5 D 모양 (4번 줄 근음)
  // aug 코드: 오픈 폼이 있으면 먼저, 그 뒤 프렛을 올린 폼
  {root:2, q:'aug', frets:[null,null,0,3,3,2]}, // Daug 오픈 D 모양
  {root:0, q:'aug', frets:[null,null,10,13,13,12]}, // Caug D 모양 (4번 줄 근음)
  {root:1, q:'aug', frets:[null,null,11,14,14,13]}, // C♯aug D 모양 (4번 줄 근음)
  {root:3, q:'aug', frets:[null,null,1,4,4,3]}, // D♯aug D 모양 (4번 줄 근음)
  {root:4, q:'aug', frets:[null,null,2,5,5,4]}, // Eaug D 모양 (4번 줄 근음)
  {root:5, q:'aug', frets:[null,null,3,6,6,5]}, // Faug D 모양 (4번 줄 근음)
  {root:6, q:'aug', frets:[null,null,4,7,7,6]}, // F♯aug D 모양 (4번 줄 근음)
  {root:7, q:'aug', frets:[null,null,5,8,8,7]}, // Gaug D 모양 (4번 줄 근음)
  {root:8, q:'aug', frets:[null,null,6,9,9,8]}, // G♯aug D 모양 (4번 줄 근음)
  {root:9, q:'aug', frets:[null,null,7,10,10,9]}, // Aaug D 모양 (4번 줄 근음)
  {root:10, q:'aug', frets:[null,null,8,11,11,10]}, // A♯aug D 모양 (4번 줄 근음)
  {root:11, q:'aug', frets:[null,null,9,12,12,11]}, // Baug D 모양 (4번 줄 근음)
  // 5 코드: 오픈 폼이 있으면 먼저, 그 뒤 프렛을 올린 폼
  {root:4, q:'5', frets:[0,2,2,null,null,null]}, // E5 오픈 E 모양
  {root:9, q:'5', frets:[null,0,2,2,null,null]}, // A5 오픈 A 모양
  {root:0, q:'5', frets:[8,10,10,null,null,null]}, // C5 E 모양 바레
  {root:1, q:'5', frets:[9,11,11,null,null,null]}, // C♯5 E 모양 바레
  {root:2, q:'5', frets:[10,12,12,null,null,null]}, // D5 E 모양 바레
  {root:3, q:'5', frets:[11,13,13,null,null,null]}, // D♯5 E 모양 바레
  {root:5, q:'5', frets:[1,3,3,null,null,null]}, // F5 E 모양 바레
  {root:6, q:'5', frets:[2,4,4,null,null,null]}, // F♯5 E 모양 바레
  {root:7, q:'5', frets:[3,5,5,null,null,null]}, // G5 E 모양 바레
  {root:8, q:'5', frets:[4,6,6,null,null,null]}, // G♯5 E 모양 바레
  {root:9, q:'5', frets:[5,7,7,null,null,null]}, // A5 E 모양 바레
  {root:10, q:'5', frets:[6,8,8,null,null,null]}, // A♯5 E 모양 바레
  {root:11, q:'5', frets:[7,9,9,null,null,null]}, // B5 E 모양 바레
  {root:0, q:'5', frets:[null,3,5,5,null,null]}, // C5 A 모양 바레
  {root:1, q:'5', frets:[null,4,6,6,null,null]}, // C♯5 A 모양 바레
  {root:2, q:'5', frets:[null,5,7,7,null,null]}, // D5 A 모양 바레
  {root:3, q:'5', frets:[null,6,8,8,null,null]}, // D♯5 A 모양 바레
  {root:4, q:'5', frets:[null,7,9,9,null,null]}, // E5 A 모양 바레
  {root:5, q:'5', frets:[null,8,10,10,null,null]}, // F5 A 모양 바레
  {root:6, q:'5', frets:[null,9,11,11,null,null]}, // F♯5 A 모양 바레
  {root:7, q:'5', frets:[null,10,12,12,null,null]}, // G5 A 모양 바레
  {root:8, q:'5', frets:[null,11,13,13,null,null]}, // G♯5 A 모양 바레
  {root:10, q:'5', frets:[null,1,3,3,null,null]}, // A♯5 A 모양 바레
  {root:11, q:'5', frets:[null,2,4,4,null,null]} // B5 A 모양 바레
];
