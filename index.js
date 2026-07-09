const express = require('express');
const cors = require('cors');
const axios = require('axios');
const cheerio = require('cheerio');

const app = express();
app.use(cors());

// المفتاح السحري بتاعك
const SCRAPER_API_KEY = 'Fa81bf7ff3fd364c2264178fc047ddb90bb7ade7dad60cf2c0b9e806e608db34';

const getScraperUrl = (targetUrl, renderJs = false) => {
    let baseUrl = `http://api.scraperapi.com?api_key=${SCRAPER_API_KEY}&url=${encodeURIComponent(targetUrl)}`;
    if (renderJs) {
        baseUrl += '&render=true'; 
    }
    return baseUrl;
};

app.get('/', (req, res) => {
    res.status(200).send('سيرفر المانجا الشامل يعمل بنجاح! 🚀');
});

// 1. جلب قائمة المانجا (معدل لطباعة الخطأ على الشاشة)
app.get('/api/scrape', async (req, res) => {
    const targetUrl = req.query.url;
    if (!targetUrl) return res.status(200).json({ success: true, count: 1, data: [{ title: 'الرجاء كتابة الرابط كاملاً', detailUrl: '', coverUrl: '', latestChapter: '', rating: 0 }] });

    try {
        const { data } = await axios.get(getScraperUrl(targetUrl, false), { timeout: 60000 });
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
        // 💡 الحركة الذكية: حنعرضوا الخطأ كأنه كرت مانجا في التليفون!
        const errorMsg = error.response && error.response.data ? JSON.stringify(error.response.data) : error.message;
        res.status(200).json({ 
            success: true, 
            count: 1, 
            data: [{ 
                title: `🚨 خطأ السيرفر الوسيط: ${errorMsg}`, 
                detailUrl: 'https://lek-manga.net', 
                coverUrl: 'https://via.placeholder.com/150', 
                latestChapter: 'حاول مجدداً', 
                rating: 0.0 
            }] 
        });
    }
});

// 2. جلب تفاصيل المانجا والفصول
app.get('/api/details', async (req, res) => {
    const targetUrl = req.query.url;
    if (!targetUrl) return res.status(400).json({ error: 'الرابط مطلوب' });

    try {
        const { data } = await axios.get(getScraperUrl(targetUrl, false), { timeout: 60000 });
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
        const errorMsg = error.response && error.response.data ? JSON.stringify(error.response.data) : error.message;
        res.json({ success: true, description: 'فشل التحميل', chapters: [{ title: `🚨 خطأ: ${errorMsg}`, url: '' }] });
    }
});

// 3. جلب صور الفصل
app.get('/api/chapter', async (req, res) => {
    const targetUrl = req.query.url;
    if (!targetUrl) return res.status(400).json({ error: 'الرابط مطلوب' });

    try {
        const { data } = await axios.get(getScraperUrl(targetUrl, true), { timeout: 90000 });
        const $ = cheerio.load(data);
        let images = [];
        
        const scriptContent = $('script').filter((i, el) => $(el).html().includes('ts_reader') || $(el).html().includes('images')).html();
        if (scriptContent) {
            const match = scriptContent.match(/"images":\s*\[(.*?)\]/);
            if (match) {
                try { images = JSON.parse(`[${match[1]}]`); } catch(e) {}
            } else {
                const jsonMatch = scriptContent.match(/ts_reader\.run\((.*?)\);/);
                if (jsonMatch && jsonMatch[1]) {
                    try {
                        const readerData = JSON.parse(jsonMatch[1]);
                        if (readerData.sources && readerData.sources.length > 0) { images = readerData.sources[0].images; }
                    } catch(e) {}
                }
            }
        }

        if (images.length === 0) {
            $('#readerarea img, .reading-content img, .page-break img, .epcontent img, .entry-content img, .vung-doc img').each((i, el) => {
                let src = $(el).attr('src') || $(el).attr('data-src') || $(el).attr('data-lazy-src') || $(el).attr('data-cfsrc');
                if (src) {
                    src = src.trim();
                    if (src.startsWith('//')) src = 'https:' + src;
                    if (src.startsWith('http') && !src.includes('logo') && !src.includes('icon')) { images.push(src); }
                }
            });
        }
        res.json({ success: true, images });
    } catch (error) {
        res.json({ success: true, images: [] });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 السيرفر يعمل على البورت ${PORT}`));