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
    // ۱. گرفتن نام فیلم از سینمتا (استریمیو)
    const metaResponse = await axios.get(`https://v3-cinemeta.strem.io/meta/${type}/${id}.json`, { timeout: 4000 });
    let movieName = metaResponse.data?.meta?.name;

    if (movieName) {
      // پاک‌سازی جزئی نام برای سرچ بهتر (مثلا حذف سال از نام فیلم)
      movieName = movieName.replace(/\s\(\d{4}\)/g, '').trim().toLowerCase();

      // ۲. خواندن مستقیم فایل آرشیو بزرگی که فرستادی
      const archiveUrl = "https://dls2.aparatchi-dlcenter.top/DonyayeSerial/donyaye_serial_all_archive.html";
      const archiveResponse = await axios.get(archiveUrl, { 
        headers: { 'User-Agent': 'Mozilla/5.0' }, 
        timeout: 6000 
      });
      
      const $ = cheerio.load(archiveResponse.data);

      // ۳. گشتن در تمام لینک‌های فایل آرشیو
      $('a').each((index, element) => {
        let link = $(element).attr('href');
        let text = $(element).text().trim().toLowerCase();

        // چک کردن اینکه آیا لینک حاوی اسم فیلم هست و فرمت ویدیویی دارد یا خیر
        if (link && text.includes(movieName) && (link.includes('.mkv') || link.includes('.mp4'))) {
          
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
      });
    }

    res.json({ streams });
  } catch (e) {
    console.error(e);
    res.json({ streams: [] });
  }
});

app.listen(PORT, () => console.log('Archive Scraper Running...'));
