const express = require('express');
const cors = require('cors');
const { launch } = require('puppeteer-real-browser');

const app = express();
app.use(cors());

// 💡 هذا الجزء هو اللي يخلي UptimeRobot ما يعطيكش خطأ 502 ويخلي السيرفر "UP" ديما
app.get('/', (req, res) => {
    res.status(200).send('السيرفر يعمل بنجاح 24/7 يا زعيم! 🚀');
});

// مسار السكرابر الأساسي
app.get('/api/scrape', async (req, res) => {
    const url = req.query.url;
    if (!url) {
        return res.status(400).json({ success: false, error: "رابط الموقع مفقود!" });
    }

    try {
        const { page, browser } = await launch({
            headless: true, // يشتغل في الخلفية
            args: ["--no-sandbox", "--disable-setuid-sandbox"], // ضرورية جداً للتشغيل على Render
        });

        await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });

        const data = await page.evaluate(() => {
            const results = [];
            // هذي التعديلات العامة اللي تناسب أغلب مواقع المانجا العربية
            const items = document.querySelectorAll('.bsx, .manga-card, .page-item-detail');
            
            items.forEach(item => {
                const title = item.querySelector('a')?.getAttribute('title') || item.innerText;
                const coverUrl = item.querySelector('img')?.getAttribute('src') || '';
                const detailUrl = item.querySelector('a')?.getAttribute('href') || '';
                const latestChapter = item.querySelector('.epxs, .chapter, .lchx')?.innerText || 'غير محدد';
                
                if (title && detailUrl) {
                    results.push({ title, coverUrl, detailUrl, latestChapter });
                }
            });
            return results;
        });

        await browser.close();
        res.json({ success: true, data });

    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`السيرفر يخدم توا على المنفذ: ${PORT}`);
});