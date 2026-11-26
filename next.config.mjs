// 정적 사이트로 내보낸다 (Vercel이 out/을 그대로 배포).
export default {
  output:'export',
  trailingSlash:true, // /notes/ 처럼 폴더째 내보내 어떤 정적 호스트에서도 열린다
  images:{unoptimized:true}
};
