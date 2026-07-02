const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const app = express();
const PORT = process.env.PORT || 3000;

const MANIFEST = {
  id: "com.donyayeserial.addon",
  version: "1.0.0",
  name: "Donyaye Serial",
  description: "استریم مستقیم فیلم و سریال از سایت دنیای سریال",
  resources: ["stream"],
  types: ["movie", "series"],
  idPrefixes: ["tt"]
};

// مسیر مانیفست برای استریمیو
app.get('/manifest.json', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.json(MANIFEST);
});

// مسیر اصلی پیدا کردن لینک‌های پخش (Stream)
app.get('/stream/:type/:id.json', async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const { type, id } = req.params; // id همان کد IMDB است مثل tt1375666
  
  try {
    // ۱. ابتدا باید نام فیلم را از یک سرویس متادیتا بر اساس کد IMDB بگیریم
    // (به عنوان مثال فرستادن درخواست به سورس Cinemeta استریمیو برای گرفتن نام انگلیسی)
    const metaResponse = await axios.get(`https://v3-cinemeta.strem.io/meta/${type}/${id}.json`);
    const movieName = metaResponse.data.meta.name;

    // ۲. سرچ کردن نام فیلم در سایت دنیای سریال
    const searchUrl = `https://donyayeserial.com/?s=${encodeURIComponent(movieName)}`;
    const searchResponse = await axios.get(searchUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    
    const $ = cheerio.load(searchResponse.data);
    const streams = [];

    // ۳. پیدا کردن اولین لینک پست در نتایج جستجو
    // نکته: کلاس‌های CSS زیر فرضی هستند و بر اساس قالب سایت باید دقیق تنظیم شوند
    const firstPostUrl = $('.post-title a').first().attr('href'); 

    if (firstPostUrl) {
      // ۴. ورود به صفحه فیلم و استخراج لینک‌های مستقیم
      const postResponse = await axios.get(firstPostUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0' }
       });
      const $post = cheerio.load(postResponse.data);

      // پیدا کردن تگ‌های a که لینک دانلود مستقیم دارند (معمولاً شامل mkv یا mp4 یا کلمه dl هستند)
      $post('a[href*="dl"]').each((index, element) => {
        const link = $post(element).attr('href');
        const text = $post(element).text().trim() || "کیفیت مستقیم";

        if (link && (link.endsWith('.mkv') || link.endsWith('.mp4'))) {
          streams.push({
            name: `دنیای سریال\n${text}`,
            title: `پخش مستقیم فیلم از سرور سایت`,
            url: link
          });
        }
      });
    }

    res.json({ streams: streams });

  } catch (error) {
    console.error(error);
    res.json({ streams: [] });
  }
});

app.listen(PORT, () => {
  console.log(`Addon is running on port ${PORT}`);
});
