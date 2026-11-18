import './globals.css';

export const metadata={
  title:'기타 코드 폼',
  description:'근음과 코드를 고르면 베이스 줄별로 짚을 수 있는 기타 코드 폼과, 코드 진행에서 손 이동이 가장 적은 폼을 보여줍니다.'
};
export const viewport={width:'device-width',initialScale:1,themeColor:'#0d0e10'};

export default function RootLayout({children}){
  return (
    <html lang="ko">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com"/>
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin=""/>
        <link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,800&family=Noto+Sans+KR:wght@400;500;700&display=swap" rel="stylesheet"/>
      </head>
      <body>{children}</body>
    </html>
  );
}
