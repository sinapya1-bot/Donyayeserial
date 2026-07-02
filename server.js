const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const app = express();
const PORT = process.env.PORT || 3000;

// هدرهای عمومی برای حل مشکل CORS در تمام مسیرها
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Access-Control-Allow-Methods', '*');
  next();
});

const MANIFEST = {
  id: "com.donyayeserial.addon",
  version: "1.0.0",
  name: "Donyaye Serial",
  description: "استریم مستقیم فیلم و سریال از سایت دنیای سریال",
  resources: ["stream"],
  types: ["movie", "series"],
  idPrefixes: ["tt"]
};

// صفحه اصلی سرور
app.get('/', (req, res) => {
  res.send('Donyaye Serial Addon is active!');
});

// مسیر مانیفست اصلی که استریمیو اول از همه باز می‌کند
app.get('/manifest.json', (req, res) => {
  res.json(MANIFEST);
});

// مسیر پیدا کردن و اسکرپ لینک‌ها
app.get('/stream/:type/:id.json', async (req, res) => {
  const { type, id } = req.params;
  const streams = [];
  
  try {
    // گرفتن متادیتا از سینمتا
    const metaResponse = await axios.get(`https://v3-cinemeta.strem.io/meta/${type}/${id}.json`, { timeout: 5000 });
    const movieName = metaResponse.data?.meta?.name;

    if (movieName) {
      const searchUrl = `https://donyayeserial.com/?s=${encodeURIComponent(movieName)}`;
      const searchResponse = await axios.get(searchUrl, { 
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
        timeout: 5000 
      });
      
      const $ = cheerio.load(searchResponse.data);
      const firstPostUrl = $('.post-title a, .post-item a, article a').first().attr('href'); 

      if (firstPostUrl) {
        const postResponse = await axios.get(firstPostUrl, { 
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
          timeout: 5000
        });
        const $post = cheerio.load(postResponse.data);

        $post('a').each((index, element) => {
          const link = $post(element).attr('href');
          const text = $post(element).text().trim() || "لینک مستقیم";

          if (link && (link.includes('.mkv') || link.includes('.mp4'))) {
            streams.push({
              name: `دنیای سریال\n${text.substring(0, 10)}`,
              title: text,
              url: link
            });
          }
        });
      }
    }
    
    res.json({ streams: streams });
  } catch (error) {
    // در صورت بلاک بودن آی‌پی یا هر خطایی، آرایه خالی برمی‌گرداند تا سرور ارور ۵۰۰ ندهد
    res.json({ streams: [] });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running.`);
});
