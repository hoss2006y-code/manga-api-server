const express = require('express');
const cors = require('cors');
const axios = require('axios');
const cheerio = require('cheerio');

const app = express();
app.use(cors());

app.get('/', (req, res) => {
    res.status(200).send('السيرفر يعمل بنجاح 24/7 بسرعة النينجا! 🥷🚀');
});

app.get('/api/scrape', async (req, res) => {
    const targetUrl = req.query.url;
    if (!targetUrl) return res.status(400).json({ success: false, error: 'الرجاء إرسال رابط url' });

    try {
        console.log(`[+] جاري سحب البيانات السريع من: ${targetUrl}`);
        
        // نتخفى كأننا متصفح عادي باش الموقع ما يطردناش
        const { data } = await axios.get(targetUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                'Accept-Language': 'ar,en-US;q=0.9,en;q=0.8'
            },
            timeout: 15000 // نعطوه 15 ثانية كحد أقصى
        });

        const $ = cheerio.load(data);
        let items = [];

        // نفس الكلاسات اللي تخدم على مواقع المانجا العربية
        const templateSelectors = ['.bsx', '.page-item-detail', '.manga-card', '.item', '.post-item', '.mangacard'];
        
        for (let selector of templateSelectors) {
            if ($(selector).length > 0) {
                $(selector).each((i, el) => {
                    const title = $(el).find('.title, h3, .post-title a, h4').text().trim() || 'بدون عنوان';
                    const detailUrl = $(el).find('a').attr('href') || '';
                    const coverUrl = $(el).find('img').attr('src') || $(el).find('img').attr('data-src') || $(el).find('img').attr('data-lazy-src') || '';
                    const latestChapter = $(el).find('.epxs, .chapter, .list-chapter a, .vol').text().trim() || '';
                    const ratingText = $(el).find('.numscore, .score, .rating').text().trim();
                    const rating = parseFloat(ratingText.replace(/[^0-9.]/g, '')) || 0.0;

                    if (detailUrl !== '') items.push({ title, detailUrl, coverUrl, latestChapter, rating });
                });
                break;
            }
        }

        res.status(200).json({ success: true, count: items.length, data: items });
    } catch (error) {
        console.error(`[-] حدث خطأ: ${error.message}`);
        res.status(500).json({ success: false, error: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 السيرفر يعمل باحترافية على البورت ${PORT}`));