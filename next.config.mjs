// 정적 사이트로 내보낸다 (Vercel, GitHub Pages 모두 같은 결과물).
// GitHub Pages는 /fret_guitar 아래에서 열리므로 GITHUB_PAGES=true일 때만 경로를 붙인다.
const pages=process.env.GITHUB_PAGES==='true';

export default {
  output:'export',
  basePath:pages?'/fret_guitar':'',
  images:{unoptimized:true}
};
