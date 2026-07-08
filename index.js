const express = require('express');
const cors = require('cors');
const axios = require('axios');
const cheerio = require('cheerio');

const app = express();
app.use(cors());

const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'ar,en-US;q=0.9,en;q=0.8',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1'
};

app.get('/', (req, res) => {
    res.status(200).send('السيرفر الشامل يعمل بنجاح! 🚀');
});

// 1. جلب قائمة المانجا
app.get('/api/scrape', async (req, res) => {
    const targetUrl = req.query.url;
    if (!targetUrl) return res.status(400).json({ success: false, error: 'الرجاء إرسال رابط url' });

    try {
        const { data } = await axios.get(targetUrl, { headers, timeout: 15000 });
        const $ = cheerio.load(data);
        let items = [];
        
        const templateSelectors = ['.bsx', '.page-item-detail', '.manga-card', '.item', '.post-item', '.mangacard', '.page-listing-item', '.c-tabs-item__content', '.series-box', '.manga-item'];
        
        for (let selector of templateSelectors) {
            if ($(selector).length > 0) {
                $(selector).each((i, el) => {
                    const title = $(el).find('.title, h3, .post-title a, h4, .series-title, .tt').first().text().trim() || 'بدون عنوان';
                    const detailUrl = $(el).find('a').first().attr('href') || '';
                    const imgNode = $(el).find('img').first();
                    const coverUrl = imgNode.attr('src') || imgNode.attr('data-src') || imgNode.attr('data-lazy-src') || '';
                    const latestChapter = $(el).find('.epxs, .chapter, .list-chapter a, .vol, .chapter-item, .ep').first().text().trim() || '';
                    const rating = parseFloat($(el).find('.numscore, .score, .rating, .score-avg').text().trim().replace(/[^0-9.]/g, '')) || 0.0;
                    
                    if (detailUrl !== '') items.push({ title, detailUrl, coverUrl, latestChapter, rating });
                });
                break; 
            }
        }
        res.status(200).json({ success: true, count: items.length, data: items });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 2. جلب تفاصيل المانجا والفصول
app.get('/api/details', async (req, res) => {
    const targetUrl = req.query.url;
    if (!targetUrl) return res.status(400).json({ error: 'الرابط مطلوب' });

    try {
        const { data } = await axios.get(targetUrl, { headers, timeout: 15000 });
        const $ = cheerio.load(data);
        
        let chapters = [];
        $('#chapterlist li, .eplister li, .cl li, .wp-manga-chapter, .chapter-list li, .chbox, .eplister ul li').each((i, el) => {
            const chapTitle = $(el).find('.chapternum, .epcur, .name, a').first().text().trim() || `الفصل`;
            const chapUrl = $(el).find('a').attr('href') || '';
            if (chapUrl) chapters.push({ title: chapTitle, url: chapUrl });
        });
        
        const description = $('.entry-content, .summary, .desc, .summary__content, .description-summary').text().trim() || 'لا توجد قصة متاحة.';
        
        res.json({ success: true, description, chapters });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 3. 💡 (المنقذ) جلب صور الفصل بطريقة الذكاء وتخطي الإخفاء
app.get('/api/chapter', async (req, res) => {
    const targetUrl = req.query.url;
    if (!targetUrl) return res.status(400).json({ error: 'الرابط مطلوب' });

    try {
        const { data } = await axios.get(targetUrl, { headers, timeout: 15000 });
        const $ = cheerio.load(data);
        
        let images = [];
        
        // 🔥 الخدعة 1: استخراج الصور لو كانت مخفية داخل كود الجافاسكربت (زي موقع Lek Manga)
        const scriptContent = $('script').filter((i, el) => $(el).html().includes('ts_reader.run')).html();
        if (scriptContent) {
            try {
                const jsonMatch = scriptContent.match(/ts_reader\.run\((.*?)\);/);
                if (jsonMatch && jsonMatch[1]) {
                    const readerData = JSON.parse(jsonMatch[1]);
                    if (readerData.sources && readerData.sources.length > 0) {
                        images = readerData.sources[0].images;
                        return res.json({ success: true, images });
                    }
                }
            } catch (e) { console.log('خطأ في استخراج الصور من السكربت'); }
        }

        // 🔥 الخدعة 2: استخراج الصور العادية لو الموقع ما يخفيش فيها
        $('#readerarea img, .reading-content img, .page-break img, .blocks-gallery-item img, .image-container img').each((i, el) => {
            let src = $(el).attr('src') || $(el).attr('data-src') || $(el).attr('data-lazy-src') || $(el).attr('data-aload');
            if (src) {
                src = src.trim();
                // التأكد إنها صورة حقيقية ومش لوجو الموقع
                if (src.startsWith('http') && !src.includes('logo') && !src.includes('banner')) {
                    images.push(src);
                }
            }
        });
        
        res.json({ success: true, images });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 السيرفر يعمل على البورت ${PORT}`));