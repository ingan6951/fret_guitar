// Supabase 클라이언트 하나를 합주 방(lib/room.js)과 로그인·동기화(lib/cloud.js)가 같이 쓴다.
import {createClient} from '@supabase/supabase-js';

// NEXT_PUBLIC_ 값은 빌드할 때 그대로 박히므로 process.env.이름 을 그대로 적어야 한다
const config=()=>({url:process.env.NEXT_PUBLIC_SUPABASE_URL,key:process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY});
export const supabaseConfigured=()=>{ const c=config(); return !!(c.url&&c.key); };

let client=null;
export function sb(){
  if(!client){
    const c=config();
    // 로그인은 기기에 남긴다. 메일 링크는 다른 브라우저(메일 앱 안 브라우저 등)에서 열려도 되도록 implicit 흐름을 쓴다.
    client=createClient(c.url,c.key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,flowType:'implicit',storageKey:'fretguide.auth'}});
  }
  return client;
}
// 테스트에서 환경을 바꾼 뒤 새 클라이언트를 만들게 한다
export function resetClient(){ client=null; }
