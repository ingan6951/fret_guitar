// 테스트용 next/link 대체: Next 라우터 없이 그냥 링크로 그린다
export default function Link({href,children,...rest}){ return <a href={href} {...rest}>{children}</a>; }
