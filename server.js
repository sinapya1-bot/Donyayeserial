const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const cors = require('cors'); // استفاده از ماژول رسمی برای باز کردن کامل دسترسی
const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors({ origin: '*' })); // باز کردن تمام دسترسی‌ها برای موبایل و تلویزیون

const MANIFEST = {
  id: "com.donyayeserial.addon",
  version: "1.0.0",
  name: "Donyaye Serial",
  description: "استریم مستقیم فیلم و سریال از سایت دنیای سریال",
  resources: ["stream"],
  types: ["movie", "series"],
  idPrefixes: ["tt"]
};

app.get('/', (req, res) => res.send('Addon Active!'));
app.get('/manifest.json', (req, res) => res.json(MANIFEST));

app.get('/stream/:type/:id.json', async (req, res) => {
  const { type, id } = req.params;
  try {
    const metaResponse = await axios.get(`https://v3-cinemeta.strem.io/meta/${type}/${id}.json`, { timeout: 4000 });
    const movieName = metaResponse.data?.meta?.name;
    const streams = [];

    if (movieName) {
      const searchUrl = `https://donyayeserial.com/?s=${encodeURIComponent(movieName)}`;
      const searchResponse = await axios.get(searchUrl, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 4000 });
      const $ = cheerio.load(searchResponse.data);
      const firstPostUrl = $('.post-title a, .post-item a, article a').first().attr('href'); 

      if (firstPostUrl) {
        const postResponse = await axios.get(firstPostUrl, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 4000 });
        const $post = cheerio.load(postResponse.data);
        $post('a').each((index, element) => {
          const link = $post(element).attr('href');
          const text = $post(element).text().trim() || "لینک مستقیم";
          if (link && (link.includes('.mkv') || link.includes('.mp4'))) {
            streams.push({ name: `دنیای سریال`, title: text, url: link });
          }
        });
      }
    }
    res.json({ streams });
  } catch (e) {
    res.json({ streams: [] });
  }
});

app.listen(PORT, () => console.log('Running...'));
