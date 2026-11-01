// Supabase 프로젝트 Settings > API에서 값을 복사해 아래 따옴표 안에 붙여 넣으세요.
const SUPABASE_URL = "https://lgmogjwtzvozwlsnhmmb.supabase.co";
const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_Z4De1ghAXc0IKj8KaclVTg_CBCFtn4O";

// 브라우저에서 사용할 Supabase 클라이언트입니다.
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
