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
  description: "استریم مستقیم فیلم و سریال",
  resources: ["stream"],
  types: ["movie", "series"],
  idPrefixes: ["tt"]
};

app.get('/', (req, res) => res.send('Addon Ready!'));
app.get('/manifest.json', (req, res) => res.json(MANIFEST));

// اصلاح ساختار مسیر برای هماهنگی ۱۰۰٪ با درخواست‌های استریمیو
app.get('/stream/:type/:id', async (req, res) => {
  const { type } = req.params;
  let id = req.params.id;
  
  // حذف حتمی .json از ته آدرس
  if (id.endsWith('.json')) {
    id = id.replace('.json', '');
  }

  const targetImdbId = id.split(':')[0].toLowerCase();
  const streams = [];

  console.log(`\n[REQUEST] Type: ${type} | IMDb ID: ${targetImdbId}`);

  try {
    const archiveUrl = "https://dls2.aparatchi-dlcenter.top/DonyayeSerial/donyaye_serial_all_archive.html";
    const archiveResponse = await axios.get(archiveUrl, { 
      headers: { 'User-Agent': 'Mozilla/5.0' }, 
      timeout: 10000 
    });
    
    const $ = cheerio.load(archiveResponse.data);
    const htmlContent = $.html();
    
    // جدا کردن متن فیلم‌ها
    const movieBlocks = htmlContent.split(/(?=\d+\.\s+)/i);

    for (const block of movieBlocks) {
      if (block.toLowerCase().includes(targetImdbId)) {
        console.log(`[FOUND] Matching block for ${targetImdbId}`);
        const $block = cheerio.load(block);
        
        $block('a').each((i, el) => {
          let link = $block(el).attr('href');
          let text = $block(el).text().trim();

          if (link && (link.includes('.mkv') || link.includes('.mp4') || link.includes('dl'))) {
            
            // فیلتر سریال
            if (type === 'series' && id.includes(':')) {
              const parts = id.split(':');
              const season = parts[1].padStart(2, '0');
              const episode = parts[2].padStart(2, '0');
              const sStr = `s${season}`;
              const eStr = `e${episode}`;
              
              if (!link.toLowerCase().includes(sStr) && !link.toLowerCase().includes(eStr)) return;
            }

            if (link.startsWith('//')) link = 'https:' + link;
            if (!link.startsWith('http')) {
              link = 'https://dls2.aparatchi-dlcenter.top/DonyayeSerial/' + link;
            }

            streams.push({
              name: `Donyaye Serial`,
              title: text || "کیفیت پخش",
              url: link,
              behaviorHints: { notWebReady: link.includes('.mkv') }
            });
          }
        });
        break; // بلوک پیدا شد، خارج شو
      }
    }

    console.log(`[RESPONSE] Injected links count: ${streams.length}`);
    res.json({ streams });
  } catch (e) {
    console.log(`[ERROR] : ${e.message}`);
    res.json({ streams: [] });
  }
});

app.listen(PORT, () => console.log('Scraper is fully running...'));

