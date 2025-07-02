const express = require('express');
const multer = require('multer');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const { marked } = require('marked');
const htmlToDocx = require('html-to-docx');
const sharp = require('sharp');
const puppeteer = require('puppeteer');
const pdfParse = require('pdf-parse');

const app = express();
const PORT = process.env.PORT || 3000;

// Helper function to generate PDF using Puppeteer with proper Chrome configuration
async function generatePDF(htmlContent, filename) {
    let browser;
    try {
        console.log('Launching Chrome for PDF generation...');
        
        // Pre-check: Ensure Puppeteer's bundled Chromium is available
        if (!process.env.CHROME_BIN && process.platform === 'linux') {
            try {
                const { execSync } = require('child_process');
                console.log('Checking Puppeteer bundled Chromium...');
                execSync('npx puppeteer browsers install chrome', { stdio: 'pipe' });
                console.log('Puppeteer bundled Chromium installed successfully');
            } catch (installError) {
                console.log('Could not install Puppeteer bundled Chromium:', installError.message);
            }
        }
        
        // Launch Chrome with environment-aware settings
        const chromeOptions = {
            headless: 'new',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--disable-gpu',
                '--disable-web-security',
                '--disable-features=VizDisplayCompositor',
                '--disable-extensions',
                '--disable-plugins',
                '--disable-background-timer-throttling',
                '--disable-backgrounding-occluded-windows',
                '--disable-renderer-backgrounding',
                '--disable-field-trial-config',
                '--disable-ipc-flooding-protection',
                '--memory-pressure-off',
                '--single-process',
                '--disable-images',
                '--disable-javascript',
                '--max_old_space_size=4096',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu-sandbox',
                '--no-sandbox',
                '--disable-background-networking',
                '--disable-default-apps',
                '--disable-sync',
                '--metrics-recording-only',
                '--no-default-browser-check',
                '--no-first-run',
                '--safebrowsing-disable-auto-update',
                '--disable-component-extensions-with-background-pages',
                '--disable-background-mode',
                '--disable-client-side-phishing-detection',
                '--disable-hang-monitor',
                '--disable-prompt-on-repost',
                '--disable-domain-reliability',
                '--disable-features=TranslateUI',
                '--disable-ipc-flooding-protection'
            ],
            timeout: 30000,
            protocolTimeout: 30000
        };

        // Set executable path based on environment
        if (process.env.CHROME_BIN) {
            chromeOptions.executablePath = process.env.CHROME_BIN;
            console.log('Using Chrome from CHROME_BIN environment variable:', process.env.CHROME_BIN);
        } else if (process.platform === 'linux') {
            // Try multiple possible Chrome paths for Linux environments
            const possiblePaths = [
                '/usr/bin/google-chrome-stable',
                '/usr/bin/google-chrome',
                '/usr/bin/chromium-browser',
                '/usr/bin/chromium',
                '/snap/bin/chromium',
                '/opt/google/chrome/chrome',
                '/usr/bin/google-chrome-beta',
                '/usr/bin/google-chrome-unstable'
            ];
            
            // Check if any of these paths exist
            const fs = require('fs');
            for (const chromePath of possiblePaths) {
                if (fs.existsSync(chromePath)) {
                    chromeOptions.executablePath = chromePath;
                    console.log('Found Chrome at:', chromePath);
                    break;
                }
            }
            
            // If no Chrome found, let Puppeteer use its bundled Chromium
            if (!chromeOptions.executablePath) {
                console.log('No system Chrome found, using Puppeteer bundled Chromium');
                // Remove any existing executablePath to use bundled Chromium
                delete chromeOptions.executablePath;
            }
        } else if (process.platform === 'darwin') {
            // macOS paths
            const possiblePaths = [
                '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
                '/Applications/Chromium.app/Contents/MacOS/Chromium'
            ];
            
            const fs = require('fs');
            for (const chromePath of possiblePaths) {
                if (fs.existsSync(chromePath)) {
                    chromeOptions.executablePath = chromePath;
                    console.log('Found Chrome at:', chromePath);
                    break;
                }
            }
            
            // If no Chrome found, let Puppeteer use its bundled Chromium
            if (!chromeOptions.executablePath) {
                console.log('No system Chrome found, using Puppeteer bundled Chromium');
                delete chromeOptions.executablePath;
            }
        }

        try {
            browser = await puppeteer.launch(chromeOptions);
            console.log('Chrome launched successfully, creating page...');
        } catch (launchError) {
            console.log('Failed to launch with custom options, trying minimal configuration...');
            
            // Try multiple fallback strategies
            const fallbackStrategies = [
                // Strategy 1: Minimal configuration
                {
                    headless: 'new',
                    args: [
                        '--no-sandbox',
                        '--disable-setuid-sandbox',
                        '--disable-dev-shm-usage'
                    ]
                },
                // Strategy 2: Force download bundled Chromium
                {
                    headless: 'new',
                    args: [
                        '--no-sandbox',
                        '--disable-setuid-sandbox',
                        '--disable-dev-shm-usage'
                    ],
                    product: 'chrome'
                },
                // Strategy 3: Use system Chrome without path
                {
                    headless: 'new',
                    args: [
                        '--no-sandbox',
                        '--disable-setuid-sandbox',
                        '--disable-dev-shm-usage'
                    ]
                }
            ];
            
            let browserLaunched = false;
            for (let i = 0; i < fallbackStrategies.length && !browserLaunched; i++) {
                try {
                    console.log(`Trying fallback strategy ${i + 1}...`);
                    browser = await puppeteer.launch(fallbackStrategies[i]);
                    console.log(`Chrome launched with fallback strategy ${i + 1}`);
                    browserLaunched = true;
                } catch (strategyError) {
                    console.log(`Fallback strategy ${i + 1} failed:`, strategyError.message);
                    if (i === fallbackStrategies.length - 1) {
                        throw strategyError;
                    }
                }
            }
        }
        
        const page = await browser.newPage();
        
        // Set content and wait for it to load
        await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
        
        console.log('Generating PDF...');
        // Generate PDF
        const pdfBuffer = await page.pdf({
            format: 'A4',
            margin: {
                top: '20mm',
                right: '20mm',
                bottom: '20mm',
                left: '20mm'
            },
            printBackground: true,
            displayHeaderFooter: false
        });

        console.log('PDF generated successfully, size:', pdfBuffer.length, 'bytes');
        return pdfBuffer;

    } catch (error) {
        console.error('PDF generation error:', error);
        
        // Check if it's the specific Chrome version error
        if (error.message.includes('Could not find Chrome') || error.message.includes('cache path is incorrectly configured')) {
            console.log('Detected Chrome version/cache issue, trying alternative approach...');
            
            try {
                // Try with a completely different approach - use system Chrome
                const { execSync } = require('child_process');
                
                // Check if we can use system Chrome directly
                if (process.platform === 'linux') {
                    const chromePaths = ['google-chrome', 'google-chrome-stable', 'chromium-browser', 'chromium'];
                    for (const chromePath of chromePaths) {
                        try {
                            execSync(`which ${chromePath}`, { stdio: 'pipe' });
                            console.log(`Found system Chrome: ${chromePath}`);
                            
                            // Try launching with system Chrome
                            const systemChromeOptions = {
                                headless: 'new',
                                executablePath: chromePath,
                                args: [
                                    '--no-sandbox',
                                    '--disable-setuid-sandbox',
                                    '--disable-dev-shm-usage'
                                ]
                            };
                            
                            browser = await puppeteer.launch(systemChromeOptions);
                            console.log('System Chrome launched successfully');
                            
                            const page = await browser.newPage();
                            await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
                            
                            const pdfBuffer = await page.pdf({
                                format: 'A4',
                                margin: {
                                    top: '20mm',
                                    right: '20mm',
                                    bottom: '20mm',
                                    left: '20mm'
                                },
                                printBackground: true,
                                displayHeaderFooter: false
                            });
                            
                            console.log('PDF generated successfully with system Chrome, size:', pdfBuffer.length, 'bytes');
                            return pdfBuffer;
                            
                        } catch (chromeError) {
                            console.log(`System Chrome ${chromePath} failed:`, chromeError.message);
                            continue;
                        }
                    }
                }
            } catch (fallbackError) {
                console.log('System Chrome fallback also failed:', fallbackError.message);
            }
        }
        
        throw new Error('PDF generation failed: ' + error.message);
    } finally {
        if (browser) {
            try {
                await browser.close();
                console.log('Chrome browser closed');
            } catch (closeError) {
                console.error('Error closing browser:', closeError);
            }
        }
    }
}

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

// HTML to PDF conversion endpoint using Puppeteer
app.post('/convert/pdf', async (req, res) => {
    try {
        const { html, filename = 'converted.pdf' } = req.body;
        
        if (!html) {
            return res.status(400).json({ error: 'HTML content is required' });
        }

        // Create a complete HTML document optimized for PDF generation
        const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Converted Document</title>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            line-height: 1.6; 
            margin: 40px; 
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            color: #333;
        }
        h1, h2, h3 { color: #333; margin-top: 1.5em; margin-bottom: 0.5em; }
        h1 { font-size: 2em; }
        h2 { font-size: 1.5em; }
        h3 { font-size: 1.2em; }
        p { margin-bottom: 1em; }
        code { background: #f4f4f4; padding: 2px 4px; border-radius: 3px; font-family: 'Courier New', monospace; }
        pre { background: #f4f4f4; padding: 15px; border-radius: 5px; overflow-x: auto; margin: 1em 0; }
        table { border-collapse: collapse; width: 100%; margin: 20px 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; font-weight: bold; }
        img { max-width: 100%; height: auto; margin: 10px 0; }
        blockquote { border-left: 4px solid #ddd; padding-left: 15px; margin: 1em 0; color: #666; }
        ul, ol { margin: 1em 0; padding-left: 2em; }
        li { margin-bottom: 0.5em; }
    </style>
</head>
<body>
    <div class="content">
        ${html}
    </div>
</body>
</html>`;

        // Generate PDF using the helper function
        const pdfBuffer = await generatePDF(fullHtml, filename);

        // Set response headers for PDF download
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Length', pdfBuffer.length);
        
        res.end(pdfBuffer);

    } catch (error) {
        console.error('PDF conversion error:', error);
        res.status(500).json({ error: 'Failed to convert to PDF: ' + error.message });
    }
});

// Backward compatibility endpoint
app.post('/convert', async (req, res) => {
    // Redirect to the PDF endpoint
    req.url = '/convert/pdf';
    return app._router.handle(req, res);
});

// Enhanced file upload endpoint (handles both HTML and Markdown)
app.post('/upload', upload.single('htmlFile'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const fileContent = req.file.buffer.toString('utf-8');
        const filename = req.file.originalname.replace(/\.[^/.]+$/, '.html');
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

        // Create a complete HTML document optimized for printing
        const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Converted Document</title>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            line-height: 1.6; 
            margin: 40px; 
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            color: #333;
        }
        h1, h2, h3 { color: #333; margin-top: 1.5em; margin-bottom: 0.5em; }
        h1 { font-size: 2em; }
        h2 { font-size: 1.5em; }
        h3 { font-size: 1.2em; }
        p { margin-bottom: 1em; }
        code { background: #f4f4f4; padding: 2px 4px; border-radius: 3px; font-family: 'Courier New', monospace; }
        pre { background: #f4f4f4; padding: 15px; border-radius: 5px; overflow-x: auto; margin: 1em 0; }
        table { border-collapse: collapse; width: 100%; margin: 20px 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; font-weight: bold; }
        img { max-width: 100%; height: auto; margin: 10px 0; }
        blockquote { border-left: 4px solid #ddd; padding-left: 15px; margin: 1em 0; color: #666; }
        ul, ol { margin: 1em 0; padding-left: 2em; }
        li { margin-bottom: 0.5em; }
        
        /* Print styles */
        @media print {
            body { 
                margin: 0; 
                padding: 10px; 
                font-size: 12pt;
                line-height: 1.4;
            }
            h1 { font-size: 18pt; }
            h2 { font-size: 16pt; }
            h3 { font-size: 14pt; }
            pre { white-space: pre-wrap; font-size: 10pt; }
            code { font-size: 10pt; }
            img { max-width: 100%; page-break-inside: avoid; }
            table { page-break-inside: avoid; }
            .no-print { display: none; }
        }
        
        /* Print button styles */
        .print-button {
            position: fixed;
            top: 20px;
            right: 20px;
            background: #4f46e5;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 5px;
            cursor: pointer;
            font-size: 14px;
            z-index: 1000;
        }
        .print-button:hover {
            background: #3730a3;
        }
        @media print {
            .print-button { display: none; }
        }
    </style>
</head>
<body>
    <button class="print-button no-print" onclick="window.print()">
        🖨️ Print to PDF
    </button>
    <div class="content">
        ${htmlContent}
    </div>
    <script>
        // Auto-print after a short delay (optional)
        // setTimeout(() => window.print(), 1000);
    </script>
</body>
</html>`;

        // Set response headers for HTML download
        res.setHeader('Content-Type', 'text/html');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Length', Buffer.byteLength(fullHtml, 'utf8'));
        
        res.send(fullHtml);

    } catch (error) {
        console.error('File conversion error:', error);
        res.status(500).json({ error: 'Failed to convert file: ' + error.message });
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

        // Resize the image with proper aspect ratio handling
        if (width && height) {
            // When both dimensions are specified, fit within bounds while maintaining aspect ratio
            sharpInstance = sharpInstance.resize(parseInt(width), parseInt(height), {
                fit: 'inside',  // Fit within bounds, don't crop
                withoutEnlargement: true  // Don't make it bigger than original
            });
        } else if (width) {
            sharpInstance = sharpInstance.resize(parseInt(width), null, { 
                withoutEnlargement: true 
            });
        } else if (height) {
            sharpInstance = sharpInstance.resize(null, parseInt(height), { 
                withoutEnlargement: true 
            });
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
        
        res.end(outputBuffer);

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
            // Generate actual PDF using wkhtmltopdf
            try {
                const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            line-height: 1.6; 
            margin: 40px; 
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            color: #333;
        }
        h1, h2, h3 { color: #333; margin-top: 1.5em; margin-bottom: 0.5em; }
        h1 { font-size: 2em; }
        h2 { font-size: 1.5em; }
        h3 { font-size: 1.2em; }
        p { margin-bottom: 1em; }
        code { background: #f4f4f4; padding: 2px 4px; border-radius: 3px; font-family: 'Courier New', monospace; }
        pre { background: #f4f4f4; padding: 15px; border-radius: 5px; overflow-x: auto; margin: 1em 0; }
        table { border-collapse: collapse; width: 100%; margin: 20px 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; font-weight: bold; }
        img { max-width: 100%; height: auto; margin: 10px 0; }
        blockquote { border-left: 4px solid #ddd; padding-left: 15px; margin: 1em 0; color: #666; }
        ul, ol { margin: 1em 0; padding-left: 2em; }
        li { margin-bottom: 0.5em; }
    </style>
</head>
<body>
    <div class="content">
        ${htmlContent}
    </div>
</body>
</html>`;

                // Generate PDF using the helper function
                const pdfBuffer = await generatePDF(fullHtml, 'converted-markdown.pdf');

                // Set response headers for PDF download
                res.setHeader('Content-Type', 'application/pdf');
                res.setHeader('Content-Disposition', 'attachment; filename="converted-markdown.pdf"');
                res.setHeader('Content-Length', pdfBuffer.length);
                
                res.end(pdfBuffer);

            } catch (error) {
                console.error('PDF generation error:', error);
                res.status(500).json({ error: 'Failed to generate PDF: ' + error.message });
            }
        } else {
            res.status(400).json({ error: 'Invalid type. Use "html" or "pdf".' });
        }
    } catch (error) {
        console.error('Markdown conversion error:', error);
        res.status(500).json({ error: 'Failed to convert markdown: ' + error.message });
    }
});

// PDF to HTML conversion endpoint
app.post('/convert-pdf-to-html', upload.single('pdf'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No PDF file uploaded' });
        }

        const pdfBuffer = req.file.buffer;
        const originalFilename = req.file.originalname;
        const filenameWithoutExt = path.parse(originalFilename).name;

        console.log('Converting PDF to HTML:', originalFilename);

        // Parse PDF content
        const pdfData = await pdfParse(pdfBuffer);
        const textContent = pdfData.text;

        // Convert text content to structured HTML
        const htmlContent = convertTextToHTML(textContent);

        // Create full HTML document
        const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${filenameWithoutExt} - Converted from PDF</title>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            line-height: 1.6; 
            margin: 0 auto;
            max-width: 800px;
            padding: 40px 20px;
            color: #333;
            background: #fff;
        }
        h1, h2, h3, h4, h5, h6 { 
            color: #2c3e50; 
            margin-top: 1.5em; 
            margin-bottom: 0.5em; 
        }
        h1 { font-size: 2.2em; border-bottom: 2px solid #3498db; padding-bottom: 10px; }
        h2 { font-size: 1.8em; border-bottom: 1px solid #bdc3c7; padding-bottom: 5px; }
        h3 { font-size: 1.4em; }
        h4 { font-size: 1.2em; }
        p { margin-bottom: 1em; text-align: justify; }
        .page-break { page-break-before: always; }
        .section { margin-bottom: 2em; }
        .highlight { background-color: #f8f9fa; padding: 15px; border-left: 4px solid #3498db; margin: 1em 0; }
        .metadata { 
            background: #f8f9fa; 
            padding: 15px; 
            border-radius: 5px; 
            margin-bottom: 2em; 
            font-size: 0.9em; 
            color: #666;
        }
        .conversion-info {
            background: #e8f5e8;
            padding: 10px;
            border-radius: 5px;
            margin-bottom: 2em;
            border-left: 4px solid #27ae60;
            font-size: 0.9em;
        }
    </style>
</head>
<body>
    <div class="conversion-info">
        <strong>📄 Converted from PDF:</strong> ${originalFilename}<br>
        <strong>📊 Pages:</strong> ${pdfData.numpages}<br>
        <strong>📅 Conversion Date:</strong> ${new Date().toLocaleDateString()}
    </div>
    
    <div class="content">
        ${htmlContent}
    </div>
    
    <div class="metadata">
        <strong>Original PDF Info:</strong><br>
        • File: ${originalFilename}<br>
        • Pages: ${pdfData.numpages}<br>
        • Text extracted: ${textContent.length} characters<br>
        • Converted on: ${new Date().toLocaleString()}
    </div>
</body>
</html>`;

        // Set response headers
        res.setHeader('Content-Type', 'text/html');
        res.setHeader('Content-Disposition', `attachment; filename="${filenameWithoutExt}.html"`);
        
        res.send(fullHtml);

    } catch (error) {
        console.error('PDF to HTML conversion error:', error);
        res.status(500).json({ error: 'Failed to convert PDF to HTML: ' + error.message });
    }
});

// HTML to Word conversion endpoint
app.post('/convert-to-word', async (req, res) => {
    try {
        const { html, filename = 'document.docx' } = req.body;
        
        if (!html || !html.trim()) {
            return res.status(400).json({ error: 'No HTML content provided' });
        }

        console.log('Converting HTML to Word document...');

        // Configure Word document options
        const options = {
            margin: {
                top: 1440,    // 1 inch in twips
                right: 1440,
                bottom: 1440,
                left: 1440
            },
            font: {
                family: 'Calibri',
                size: 11
            },
            table: {
                row: {
                    cantSplit: true
                }
            },
            header: false,
            footer: false,
            pageNumber: false
        };

        // Convert HTML to Word document
        const docxBuffer = await htmlToDocx(html, null, options);

        // Set response headers for Word document download
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Length', docxBuffer.length);
        
        res.end(docxBuffer);

    } catch (error) {
        console.error('Word conversion error:', error);
        res.status(500).json({ error: 'Failed to convert to Word: ' + error.message });
    }
});

// Helper function to convert PDF text to structured HTML
function convertTextToHTML(text) {
    if (!text || text.trim() === '') {
        return '<p>No text content found in the PDF.</p>';
    }

    // Split text into lines
    const lines = text.split('\n').filter(line => line.trim() !== '');
    
    let html = '';
    let inList = false;
    let inParagraph = false;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // Skip empty lines
        if (line === '') {
            if (inParagraph) {
                html += '</p>';
                inParagraph = false;
            }
            if (inList) {
                html += '</ul>';
                inList = false;
            }
            continue;
        }

        // Detect headers (lines that are shorter and end with common patterns)
        if (isHeader(line, lines, i)) {
            if (inParagraph) {
                html += '</p>';
                inParagraph = false;
            }
            if (inList) {
                html += '</ul>';
                inList = false;
            }
            
            const headerLevel = getHeaderLevel(line);
            html += `<h${headerLevel}>${escapeHtml(line)}</h${headerLevel}>`;
            continue;
        }

        // Detect list items
        if (isListItem(line)) {
            if (inParagraph) {
                html += '</p>';
                inParagraph = false;
            }
            if (!inList) {
                html += '<ul>';
                inList = true;
            }
            const listItem = line.replace(/^[\s•\-\*]+/, '').trim();
            html += `<li>${escapeHtml(listItem)}</li>`;
            continue;
        }

        // Regular paragraph
        if (!inParagraph) {
            html += '<p>';
            inParagraph = true;
        }
        html += escapeHtml(line) + ' ';
    }

    // Close any open tags
    if (inParagraph) {
        html += '</p>';
    }
    if (inList) {
        html += '</ul>';
    }

    return html || '<p>No content could be extracted from the PDF.</p>';
}

// Helper function to detect if a line is a header
function isHeader(line, allLines, currentIndex) {
    // Headers are usually shorter than regular text
    if (line.length > 100) return false;
    
    // Check if it's followed by a longer line (indicating content)
    if (currentIndex < allLines.length - 1) {
        const nextLine = allLines[currentIndex + 1].trim();
        if (nextLine.length > line.length * 2) return true;
    }
    
    // Common header patterns
    const headerPatterns = [
        /^[A-Z][A-Z\s]+$/, // ALL CAPS
        /^[A-Z][a-z]+(\s+[A-Z][a-z]+)*$/, // Title Case
        /^\d+\.\s+[A-Z]/, // Numbered sections
        /^[IVX]+\.\s+[A-Z]/, // Roman numerals
        /^Chapter\s+\d+/i, // Chapter headers
        /^Section\s+\d+/i, // Section headers
    ];
    
    return headerPatterns.some(pattern => pattern.test(line));
}

// Helper function to determine header level
function getHeaderLevel(line) {
    if (/^[A-Z][A-Z\s]+$/.test(line)) return 1; // ALL CAPS = H1
    if (/^\d+\.\s+[A-Z]/.test(line)) return 2; // Numbered = H2
    if (/^[IVX]+\.\s+[A-Z]/.test(line)) return 2; // Roman = H2
    if (/^Chapter\s+\d+/i.test(line)) return 1; // Chapter = H1
    if (/^Section\s+\d+/i.test(line)) return 2; // Section = H2
    return 3; // Default = H3
}

// Helper function to detect list items
function isListItem(line) {
    const listPatterns = [
        /^[\s]*[•\-\*]\s+/, // Bullet points
        /^[\s]*\d+\.\s+/, // Numbered lists
        /^[\s]*[a-z]\.\s+/, // Lettered lists
    ];
    return listPatterns.some(pattern => pattern.test(line));
}

// Helper function to escape HTML
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, function(m) { return map[m]; });
}

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