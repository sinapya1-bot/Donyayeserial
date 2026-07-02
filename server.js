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
  description: "استریم مستقیم فیلم و سریال از آرشیو متنی دنیای سریال",
  resources: ["stream"],
  types: ["movie", "series"],
  idPrefixes: ["tt"]
};

app.get('/', (req, res) => res.send('Addon Ready!'));
app.get('/manifest.json', (req, res) => res.json(MANIFEST));

app.get('/stream/:type/:id', async (req, res) => {
  const { type } = req.params;
  let id = req.params.id.replace('.json', '');
  const streams = [];

  // دریافت آی‌دی اصلی فیلم (مثلاً tt0069947)
  const targetImdbId = id.split(':')[0].toLowerCase();
  console.log(`Searching for block of IMDb ID: ${targetImdbId}`);

  try {
    const archiveUrl = "https://dls2.aparatchi-dlcenter.top/DonyayeSerial/donyaye_serial_all_archive.html";
    const archiveResponse = await axios.get(archiveUrl, { 
      headers: { 'User-Agent': 'Mozilla/5.0' }, 
      timeout: 10000 
    });
    
    const $ = cheerio.load(archiveResponse.data);

    // کل متن صفحه را بر اساس خطوط یا المان‌ها پیمایش می‌کنیم
    // راهکار: پیدا کردن المان متنی که شامل این آی‌دی است
    let targetElement = null;
    
    $('*').each((i, el) => {
      const text = $(el).text();
      if (text.includes(`IMDb Code: ${targetImdbId}`) || text.includes(`tt` + targetImdbId.replace('tt', ''))) {
        // پیدا کردن دقیق‌ترین المانی که این متن را دارد (ترجیحاً المان‌های بدون فرزند بزرگ)
        if ($(el).children().length <= 3) {
          targetElement = el;
        }
      }
    });

    if (targetElement) {
      console.log(`Found the movie block! Extracting links until next movie...`);
      
      // حرکت به المان‌های بعدی برای جمع‌آوری لینک‌ها تا زمانی که به یک فیلم جدید برسیم
      let current = $(targetElement).next();
      let foundNextMovie = false;

      while (current.length && !foundNextMovie) {
        // اگر به مشخصات فیلم بعدی رسیدیم، حلقه را متوقف کن
        if (current.text().includes('IMDb Code: tt') || current.text().match(/\d+\.\s+[A-Z]/)) {
          foundNextMovie = true;
          break;
        }

        // پیدا کردن تمام تگ‌های لینک (<a>) در این بخش
        const linksInCurrent = current.find('a').length ? current.find('a') : (current.is('a') ? current : []);
        
        if (linksInCurrent.length) {
          $(linksInCurrent).each((i, aEl) => {
            let link = $(aEl).attr('href');
            let text = $(aEl).text().trim();

            if (link && (link.includes('.mkv') || link.includes('.mp4'))) {
              
              // فیلتر فصل و قسمت برای سریال‌ها
              if (type === 'series' && id.includes(':')) {
                const parts = id.split(':');
                const season = parts[1].padStart(2, '0');
                const episode = parts[2].padStart(2, '0');
                const sStr = `s${season}`;
                const eStr = `e${episode}`;
                
                if (!link.toLowerCase().includes(sStr) && !link.toLowerCase().includes(eStr)) return;
              }

              // اصلاح لینک‌های نسبی به مطلق
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
        }

        current = current.next();
      }
    }

    console.log(`Successfully parsed links count: ${streams.length}`);
    res.json({ streams });
  } catch (e) {
    console.log(`Error: ${e.message}`);
    res.json({ streams: [] });
  }
});

app.listen(PORT, () => console.log('Sequential IMDb Scraper Running...'));
