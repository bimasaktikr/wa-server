const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');
const cors = require('cors');

const app = express();
const port = 3000;

const API_KEY = '@kuncirahasiawhatsappserverbpskotamalang3573';

app.use(cors());
app.use(express.json());

let qrCode = null;

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        args: ['--no-sandbox']
    }
});


// Middleware to check API Key
function checkApiKey(req, res, next) {
    const apiKey = req.headers['x-api-key'];

    if (apiKey !== API_KEY) {
        return res.status(401).json({ error: 'Unauthorized - Invalid API Key' });
    }

    next(); // lanjut ke route berikutnya
}

app.get('/', (req, res) => {
    res.send(`
        <html>
            <head><title>WA Server</title></head>
            <body>
                <h1>🟢 WA Server is running!</h1>
                <p><a href="/status">Check Status</a> | <a href="/qr">QR Code</a></p>
            </body>
        </html>
    `);
});


client.on('qr', checkApiKey , (qr) => {
    console.log('QR generated');
    qrCode = qr;
});

client.on('ready', () => {
    console.log('WhatsApp is ready!');
    qrCode = null; // Clear QR after connected
});

client.on('authenticated', () => {
    console.log('WhatsApp authenticated');
    qrCode = null; // Clear QR after authentication
});

client.on('disconnected', (reason) => {
    console.log('WhatsApp disconnected:', reason);
    qrCode = null;
});

client.initialize();

// === GET QR Code ===
app.get('/qr', checkApiKey, (req, res) => {
    if (qrCode) {
        res.json({ qr: qrCode });
    } else {
        res.status(404).json({ error: 'QR not available' });
    }
});

// === GET Status ===
app.get('/status', checkApiKey, (req, res) => {
    let status = 'DISCONNECTED';
    let clientInfo = null;

    if (qrCode) {
        status = 'SCAN_QR';
    } else if (client.info && client.info.wid) {
        status = 'CONNECTED';
        clientInfo = {
            name: client.info.pushname || 'Unknown',
            number: client.info.wid.user
        };
    }

    res.json({
        status,
        clientInfo
    });
});

// === Test Message API (optional) ===
app.post('/send-message', checkApiKey , async (req, res) => {
    const { number, message } = req.body;

    if (!number || !message) {
        return res.status(400).json({ error: 'Number and message required' });
    }

    const fullNumber = number.includes('@c.us') ? number : `${number}@c.us`;

    try {
        const sentMessage = await client.sendMessage(fullNumber, message);
        res.json({
            success: true,
            messageId: sentMessage.id.id,
            message: 'Message sent successfully'
        }); // Sending back success message
    } catch (error) {
        res.status(500).json({
            error: 'Failed to send message',
            details: error.message
        });
    }
});

// === Start server ===
app.listen(port, () => {
    console.log(`🟢 WhatsApp server running at http://localhost:${port}`);
});
