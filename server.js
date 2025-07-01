const express = require('express');
const puppeteer = require('puppeteer');
const multer = require('multer');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const { marked } = require('marked');
const htmlToDocx = require('html-to-docx');
const sharp = require('sharp');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static('.'));

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Ensure uploads directory exists (only for local development)
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
    const uploadsDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadsDir)) {
        try {
            fs.mkdirSync(uploadsDir);
        } catch (error) {
            console.log('Could not create uploads directory:', error.message);
        }
    }
}

// HTML to PDF conversion endpoint
app.post('/convert', async (req, res) => {
    try {
        const { html, filename = 'converted.pdf' } = req.body;
        
        if (!html) {
            return res.status(400).json({ error: 'HTML content is required' });
        }

        // Launch browser with serverless-compatible options
        const browser = await puppeteer.launch({
            headless: 'new',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--no-first-run',
                '--no-zygote',
                '--single-process',
                '--disable-extensions'
            ]
        });

        const page = await browser.newPage();
        
        // Set content and wait for it to load
        await page.setContent(html, { waitUntil: 'networkidle0' });
        
        // Generate PDF with editable text
        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: {
                top: '20px',
                right: '20px',
                bottom: '20px',
                left: '20px'
            },
            preferCSSPageSize: true
        });

        await browser.close();

        // Set response headers for PDF download
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Length', pdfBuffer.length);
        
        res.send(pdfBuffer);

    } catch (error) {
        console.error('PDF conversion error:', error);
        res.status(500).json({ error: 'Failed to convert HTML to PDF: ' + error.message });
    }
});

// Enhanced file upload endpoint (handles both HTML and Markdown)
app.post('/upload', upload.single('htmlFile'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const fileContent = req.file.buffer.toString('utf-8');
        const filename = req.file.originalname.replace(/\.[^/.]+$/, '.pdf');
        const fileExt = path.extname(req.file.originalname).toLowerCase();

        // Determine if it's HTML or Markdown
        let htmlContent;
        if (['.html', '.htm'].includes(fileExt)) {
            htmlContent = fileContent;
        } else if (['.md', '.markdown', '.txt'].includes(fileExt)) {
            htmlContent = marked.parse(fileContent);
        } else {
            return res.status(400).json({ error: 'Unsupported file type. Please upload HTML or Markdown files.' });
        }

        // Launch browser with serverless-compatible options
        const browser = await puppeteer.launch({
            headless: 'new',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--no-first-run',
                '--no-zygote',
                '--single-process',
                '--disable-extensions'
            ]
        });

        const page = await browser.newPage();
        
        // Set content and wait for it to load
        await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
        
        // Generate PDF with editable text
        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: {
                top: '20px',
                right: '20px',
                bottom: '20px',
                left: '20px'
            },
            preferCSSPageSize: true
        });

        await browser.close();

        // Set response headers for PDF download
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Length', pdfBuffer.length);
        
        res.send(pdfBuffer);

    } catch (error) {
        console.error('PDF conversion error:', error);
        res.status(500).json({ error: 'Failed to convert file to PDF: ' + error.message });
    }
});

// Image resizing endpoint
app.post('/resize-image', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No image uploaded' });
        }

        const { width, height, quality = 90, format = 'jpeg' } = req.body;
        
        if (!width && !height) {
            return res.status(400).json({ error: 'Please specify at least width or height' });
        }

        let sharpInstance = sharp(req.file.buffer);

        // Resize the image
        if (width && height) {
            sharpInstance = sharpInstance.resize(parseInt(width), parseInt(height));
        } else if (width) {
            sharpInstance = sharpInstance.resize(parseInt(width), null, { withoutEnlargement: true });
        } else if (height) {
            sharpInstance = sharpInstance.resize(null, parseInt(height), { withoutEnlargement: true });
        }

        // Convert to specified format
        let outputBuffer;
        switch (format.toLowerCase()) {
            case 'jpeg':
            case 'jpg':
                outputBuffer = await sharpInstance.jpeg({ quality: parseInt(quality) }).toBuffer();
                break;
            case 'png':
                outputBuffer = await sharpInstance.png({ quality: parseInt(quality) }).toBuffer();
                break;
            case 'webp':
                outputBuffer = await sharpInstance.webp({ quality: parseInt(quality) }).toBuffer();
                break;
            default:
                return res.status(400).json({ error: 'Unsupported format. Use jpeg, png, or webp.' });
        }

        // Set response headers
        const mimeType = format === 'jpeg' || format === 'jpg' ? 'image/jpeg' : 
                        format === 'png' ? 'image/png' : 'image/webp';
        
        res.setHeader('Content-Type', mimeType);
        res.setHeader('Content-Disposition', `attachment; filename="resized-image.${format}"`);
        res.setHeader('Content-Length', outputBuffer.length);
        
        res.send(outputBuffer);

    } catch (error) {
        console.error('Image resizing error:', error);
        res.status(500).json({ error: 'Failed to resize image: ' + error.message });
    }
});

// Markdown to PDF/HTML endpoint
app.post('/convert-md', async (req, res) => {
    try {
        const { markdown, type } = req.body;
        if (!markdown || !type) {
            return res.status(400).json({ error: 'Markdown content and type are required' });
        }

        const htmlContent = marked.parse(markdown);
        const title = 'Converted Markdown Document';

        if (type === 'html') {
            // Return HTML file
            const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; margin: 40px; }
        h1, h2, h3 { color: #333; }
        code { background: #f4f4f4; padding: 2px 4px; border-radius: 3px; }
        pre { background: #f4f4f4; padding: 15px; border-radius: 5px; overflow-x: auto; }
    </style>
</head>
<body>
    ${htmlContent}
</body>
</html>`;

            res.setHeader('Content-Type', 'text/html');
            res.setHeader('Content-Disposition', 'attachment; filename="converted-markdown.html"');
            res.send(fullHtml);
        } else if (type === 'pdf') {
            // Convert to PDF
            const browser = await puppeteer.launch({
                headless: 'new',
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-gpu',
                    '--no-first-run',
                    '--no-zygote',
                    '--single-process',
                    '--disable-extensions'
                ]
            });

            const page = await browser.newPage();
            const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; margin: 40px; }
        h1, h2, h3 { color: #333; }
        code { background: #f4f4f4; padding: 2px 4px; border-radius: 3px; }
        pre { background: #f4f4f4; padding: 15px; border-radius: 5px; overflow-x: auto; }
    </style>
</head>
<body>
    ${htmlContent}
</body>
</html>`;

            await page.setContent(fullHtml, { waitUntil: 'networkidle0' });
            const pdfBuffer = await page.pdf({
                format: 'A4',
                printBackground: true,
                margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' }
            });

            await browser.close();

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', 'attachment; filename="converted-markdown.pdf"');
            res.setHeader('Content-Length', pdfBuffer.length);
            res.send(pdfBuffer);
        } else {
            res.status(400).json({ error: 'Invalid type. Use "html" or "pdf".' });
        }
    } catch (error) {
        console.error('Markdown conversion error:', error);
        res.status(500).json({ error: 'Failed to convert markdown: ' + error.message });
    }
});

// Health check endpoint for Vercel
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK', message: 'Server is running' });
});

// Root endpoint
app.get('/', (req, res) => {
    const indexPath = path.join(__dirname, 'index.html');
    console.log('Current directory:', __dirname);
    console.log('Looking for index.html at:', indexPath);
    
    if (require('fs').existsSync(indexPath)) {
        console.log('Found index.html, serving file');
        res.sendFile(indexPath);
    } else {
        console.log('index.html not found, serving fallback');
        // List files in current directory for debugging
        try {
            const files = require('fs').readdirSync(__dirname);
            console.log('Files in directory:', files);
        } catch (error) {
            console.log('Error reading directory:', error.message);
        }
        
        // Fallback: send a simple HTML response
        res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Universal Document Converter</title>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body>
                <h1>Universal Document Converter</h1>
                <p>The server is running. Please check the file path.</p>
                <p>Current directory: ${__dirname}</p>
                <p>Looking for: ${indexPath}</p>
                <p><a href="/health">Health Check</a></p>
            </body>
            </html>
        `);
    }
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Unhandled error:', error);
    res.status(500).json({ error: 'Internal server error: ' + error.message });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

// Export for Vercel
module.exports = app; 