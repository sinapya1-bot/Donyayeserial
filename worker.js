const MANIFEST = {
  id: "com.donyayeserial.githack",
  version: "1.0.0",
  name: "Donyaye Serial GitHub",
  description: "پخش از گیت‌هاب",
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
    // بقیه منطق کد در اینجا قرار می‌گیرد
    return new Response('OK');
  }
};
