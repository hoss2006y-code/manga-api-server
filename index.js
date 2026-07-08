const express = require('express');
const cors = require('cors');
const puppeteer = require('puppeteer'); // 💡 استدعينا المكتبة الجديدة هنا

const app = express();
app.use(cors()); 

app.get('/', (req, res) => {
    res.status(200).send('السيرفر يعمل بنجاح 24/7 يا زعيم! 🚀');
});

app.get('/api/scrape', async (req, res) => {
    const targetUrl = req.query.url;
    if (!targetUrl) return res.status(400).json({ success: false, error: 'الرجاء إرسال رابط url' });

    let browser = null;
    try {
        console.log(`[+] جاري سحب البيانات من: ${targetUrl}`);
        
        // 💡 إعدادات خاصة بالسيرفرات السحابية المجانية باش يشتغل بدون مشاكل
        browser = await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--no-first-run',
                '--no-zygote',
                '--single-process'
            ]
        });
        
        const page = await browser.newPage();
        
        // 💡 خدعة بسيطة لتجاوز الحماية (نتظاهروا إننا نستخدموا ويندوز عادي)
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

        await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await new Promise(r => setTimeout(r, 3000));

        const scrapedData = await page.evaluate(() => {
            const templateSelectors = ['.bsx', '.page-item-detail', '.manga-card', '.item', '.post-item', '.mangacard'];
            let items = [];
            for (let selector of templateSelectors) {
                const nodes = document.querySelectorAll(selector);
                if (nodes.length > 0) {
                    nodes.forEach(node => {
                        const titleNode = node.querySelector('.title, h3, .post-title a, h4');
                        const title = titleNode ? titleNode.innerText.trim() : 'بدون عنوان';
                        const linkNode = node.querySelector('a');
                        const detailUrl = linkNode ? linkNode.href : '';
                        const imgNode = node.querySelector('img');
                        let coverUrl = imgNode ? (imgNode.getAttribute('src') || imgNode.getAttribute('data-src') || imgNode.getAttribute('data-lazy-src') || '') : '';
                        const chapterNode = node.querySelector('.epxs, .chapter, .list-chapter a, .vol');
                        const latestChapter = chapterNode ? chapterNode.innerText.trim() : '';
                        const ratingNode = node.querySelector('.numscore, .score, .rating');
                        const rating = ratingNode ? parseFloat(ratingNode.innerText.trim().replace(/[^0-9.]/g, '')) : 0.0;

                        if (detailUrl !== '') items.push({ title, detailUrl, coverUrl, latestChapter, rating: isNaN(rating) ? 0.0 : rating });
                    });
                    break; 
                }
            }
            return items;
        });

        await browser.close();
        res.status(200).json({ success: true, count: scrapedData.length, data: scrapedData });
    } catch (error) {
        if (browser) await browser.close();
        console.error(`[-] حدث خطأ: ${error.message}`);
        res.status(500).json({ success: false, error: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 السيرفر يعمل باحترافية على البورت ${PORT}`));