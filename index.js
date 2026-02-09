import express from 'express';
import { chromium } from 'playwright';

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

app.post('/parse', async (req, res) => {
  const { channel } = req.body;

  if (!channel) {
    return res.status(400).json({ error: 'channel required' });
  }

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.goto(`https://t.me/s/${channel}`, { timeout: 60000 });
    await page.waitForTimeout(3000);

    const posts = await page.$$eval(
      'div.tgme_widget_message',
      nodes => nodes.map(n => ({
        date: n.querySelector('time')?.getAttribute('datetime') || '',
        text: n.querySelector('.tgme_widget_message_text')?.innerText || '',
        views: Number(
          n.querySelector('.tgme_widget_message_views')
            ?.innerText.replace(/\D/g, '')
        ) || 0,
        url: n.querySelector('.tgme_widget_message_date')?.href || ''
      }))
    );

    res.json({ channel, posts });

  } catch (e) {
    res.status(500).json({ error: e.message });
  } finally {
    await browser.close();
  }
});

app.listen(PORT, () => {
  console.log('Telegram parser started on port', PORT);
});
