const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors({ origin: '*' }));

const MANIFEST = {
  id: "com.donyayeserial.addon",
  version: "1.0.0",
  name: "Donyaye Serial",
  description: "استریم مستقیم از آرشیو جامع دنیای سریال",
  resources: ["stream"],
  types: ["movie", "series"],
  idPrefixes: ["tt"]
};

app.get('/', (req, res) => res.send('Archive Addon Active!'));
app.get('/manifest.json', (req, res) => res.json(MANIFEST));

app.get('/stream/:type/:id.json', async (req, res) => {
  const { type, id } = req.params;
  const streams = [];

  try {
    // ۱. گرفتن نام فیلم از سینمتا
    const metaResponse = await axios.get(`https://v3-cinemeta.strem.io/meta/${type}/${id}.json`, { timeout: 4000 });
    let movieName = metaResponse.data?.meta?.name;

    if (movieName) {
      // پاک‌سازی نام فیلم و تبدیل آن به کلمات کلیدی مجزا
      // مثلاً "The Dark Knight" تبدیل می‌شود به آرایه‌ای شامل ["the", "dark", "knight"]
      const cleanName = movieName.replace(/[^a-zA-Z0-9\s]/g, '').toLowerCase();
      const keywords = cleanName.split(/\s+/).filter(word => word.length > 2); // کلمات کوتاه زیر ۲ حرف حذف می‌شوند تا سرچ اشتباه نشود

      // ۲. خواندن فایل آرشیو بزرگ
      const archiveUrl = "https://dls2.aparatchi-dlcenter.top/DonyayeSerial/donyaye_serial_all_archive.html";
      const archiveResponse = await axios.get(archiveUrl, { 
        headers: { 'User-Agent': 'Mozilla/5.0' }, 
        timeout: 6000 
      });
      
      const $ = cheerio.load(archiveResponse.data);

      // ۳. گشتن هوشمند در تمام لینک‌های فایل آرشیو
      $('a').each((index, element) => {
        let link = $(element).attr('href');
        let text = $(element).text().trim().toLowerCase();

        if (link && (link.includes('.mkv') || link.includes('.mp4'))) {
          
          // بررسی اینکه آیا تمام کلمات کلیدی اسم فیلم در متن لینک موجود است یا خیر
          const isMatch = keywords.every(keyword => text.includes(keyword) || link.toLowerCase().includes(keyword));

          if (isMatch) {
            // حل مشکل لینک‌های نسبی در آرشیو
            if (link.startsWith('//')) link = 'https:' + link;
            if (!link.startsWith('http')) {
              link = 'https://dls2.aparatchi-dlcenter.top/DonyayeSerial/' + link;
            }

            streams.push({
              name: `Donyaye Serial`,
              title: $(element).text().trim() || "پخش مستقیم فیلم",
              url: link,
              behaviorHints: {
                notWebReady: link.includes('.mkv')
              }
            });
          }
        }
      });
    }

    res.json({ streams });
  } catch (e) {
    console.error(e);
    res.json({ streams: [] });
  }
});

app.listen(PORT, () => console.log('Archive Scraper Running...'));
