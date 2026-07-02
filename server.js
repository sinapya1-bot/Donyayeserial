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

// تغییر پترن آدرس برای اینکه استریمیو هر فرمتی از آی‌دی سریال یا فیلم فرستاد، خراب نشود
app.get('/stream/:type/:id', async (req, res) => {
  const { type } = req.params;
  let id = req.params.id;
  
  // حذف پسوند .json از انتهای آی‌دی در صورت وجود
  if (id.endsWith('.json')) {
    id = id.replace('.json', '');
  }

  const streams = [];
  console.log(`=== Request received for Type: ${type}, ID: ${id} ===`);

  try {
    // اگر سریال باشد، آی‌دی حاوی فصل و قسمت است (مثلا tt12345:1:1)، پس بخش اصلی tt را جدا می‌کنیم
    const mainImdbId = id.split(':')[0];

    // ۱. گرفتن نام فیلم یا سریال از سینمتا
    const metaResponse = await axios.get(`https://v3-cinemeta.strem.io/meta/${type}/${mainImdbId}.json`, { timeout: 4000 });
    let titleName = metaResponse.data?.meta?.name;
    console.log(`Found Title Name: ${titleName}`);

    if (titleName) {
      const cleanName = titleName.replace(/[^a-zA-Z0-9\s]/g, '').toLowerCase();
      const keywords = cleanName.split(/\s+/).filter(word => word.length > 2);
      console.log(`Keywords to match: ${JSON.stringify(keywords)}`);

      // ۲. خواندن فایل آرشیو بزرگ
      const archiveUrl = "https://dls2.aparatchi-dlcenter.top/DonyayeSerial/donyaye_serial_all_archive.html";
      const archiveResponse = await axios.get(archiveUrl, { 
        headers: { 'User-Agent': 'Mozilla/5.0' }, 
        timeout: 8000 
      });
      
      const $ = cheerio.load(archiveResponse.data);

      // ۳. گشتن هوشمند در تمام لینک‌ها
      $('a').each((index, element) => {
        let link = $(element).attr('href');
        let text = $(element).text().trim().toLowerCase();

        if (link && (link.includes('.mkv') || link.includes('.mp4'))) {
          // چک کردن کلمات کلیدی اسم
          const isMatch = keywords.every(keyword => text.includes(keyword) || link.toLowerCase().includes(keyword));

          if (isMatch) {
            // اگر سریال است، چک کنیم که شماره فصل و قسمت هم در نام فایل باشد (مثلاً S05E01)
            if (type === 'series' && id.includes(':')) {
              const parts = id.split(':'); // [tt12345, season, episode]
              const season = parts[1].padStart(2, '0'); // تبدیل 5 به 05
              const episode = parts[2].padStart(2, '0'); // تبدیل 1 به 01
              
              const sPattern = `s${season}`;
              const ePattern = `e${episode}`;
              
              // اگر لینک حاوی شماره فصل و قسمت نبود، ردش کن بره
              if (!text.includes(sPattern) && !link.toLowerCase().includes(sPattern)) return;
              if (!text.includes(ePattern) && !link.toLowerCase().includes(ePattern)) return;
            }

            if (link.startsWith('//')) link = 'https:' + link;
            if (!link.startsWith('http')) {
              link = 'https://dls2.aparatchi-dlcenter.top/DonyayeSerial/' + link;
            }

            streams.push({
              name: `Donyaye Serial`,
              title: $(element).text().trim() || "پخش مستقیم",
              url: link,
              behaviorHints: { notWebReady: link.includes('.mkv') }
            });
          }
        }
      });
    }

    console.log(`Matches found: ${streams.length}`);
    res.json({ streams });
  } catch (e) {
    console.log(`Error: ${e.message}`);
    res.json({ streams: [] });
  }
});

app.listen(PORT, () => console.log('Server is up and running!'));
