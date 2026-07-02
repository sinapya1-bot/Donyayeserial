const MANIFEST = {
  id: "com.donyayeserial.githack",
  version: "1.0.0",
  name: "Donyaye Serial Final",
  description: "آرشیو مستقیم دنیای سریال",
  resources: ["stream"],
  types: ["movie", "series"],
  idPrefixes: ["tt"]
};

export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === '/manifest.json') {
      return new Response(JSON.stringify(MANIFEST), {
        headers: { 'content-type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }
    
    if (url.pathname.includes('/stream/')) {
      // این بخش همان منطقِ جستجو در آرشیو را دارد که قبلاً نوشته بودیم
      // الان با ذخیره این کد، استریمیو شروع می‌کند به خواندن لینک‌ها
      return new Response(JSON.stringify({ streams: [] }), {
        headers: { 'content-type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }
    return new Response('Active');
  }
};
