const express = require('express');
const cors = require('cors');
const { connect } = require('puppeteer-real-browser');

const app = express();
app.use(cors()); 

app.get('/api/scrape', async (req, res) => {
    const targetUrl = req.query.url;
    if (!targetUrl) return res.status(400).json({ success: false, error: 'الرجاء إرسال رابط url' });

    let browser = null;
    try {
        console.log(`[+] جاري اختراق وتصفح: ${targetUrl}`);
        const response = await connect({ headless: "auto", customConfig: {}, turnstile: true, disableXvfb: false, ignoreAllFlags: false });
        browser = response.browser;
        const page = response.page;

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

app.listen(3000, () => console.log(`🚀 السيرفر يعمل باحترافية على البورت 3000`));