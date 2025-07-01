#!/usr/bin/env node

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { marked } = require('marked');
const sharp = require('sharp');

// Create readline interface for user input
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Helper function to prompt user for input
function askQuestion(question) {
    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            resolve(answer.trim());
        });
    });
}

// Helper function to close readline interface
function closeInterface() {
    rl.close();
}

// HTML template for Markdown content
function createHtmlTemplate(content, title = 'Document') {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 40px 20px;
            background: white;
        }
        
        h1, h2, h3, h4, h5, h6 {
            color: #2c3e50;
            margin-top: 30px;
            margin-bottom: 15px;
            font-weight: 600;
        }
        
        h1 { font-size: 2.2em; border-bottom: 3px solid #3498db; padding-bottom: 10px; }
        h2 { font-size: 1.8em; border-bottom: 2px solid #ecf0f1; padding-bottom: 8px; }
        h3 { font-size: 1.4em; }
        h4 { font-size: 1.2em; }
        
        p {
            margin-bottom: 15px;
            text-align: justify;
        }
        
        ul, ol {
            margin-bottom: 15px;
            padding-left: 30px;
        }
        
        li {
            margin-bottom: 5px;
        }
        
        blockquote {
            border-left: 4px solid #3498db;
            margin: 20px 0;
            padding: 10px 20px;
            background: #f8f9fa;
            font-style: italic;
        }
        
        code {
            background: #f4f4f4;
            padding: 2px 6px;
            border-radius: 3px;
            font-family: 'Courier New', monospace;
            font-size: 0.9em;
        }
        
        pre {
            background: #2c3e50;
            color: #ecf0f1;
            padding: 15px;
            border-radius: 5px;
            overflow-x: auto;
            margin: 20px 0;
        }
        
        pre code {
            background: none;
            padding: 0;
            color: inherit;
        }
        
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
            font-size: 0.9em;
        }
        
        th, td {
            border: 1px solid #ddd;
            padding: 12px;
            text-align: left;
        }
        
        th {
            background: #3498db;
            color: white;
            font-weight: bold;
        }
        
        tr:nth-child(even) {
            background: #f8f9fa;
        }
        
        img {
            max-width: 100%;
            height: auto;
            display: block;
            margin: 20px auto;
        }
        
        hr {
            border: none;
            border-top: 2px solid #ecf0f1;
            margin: 30px 0;
        }
        
        @media print {
            body { margin: 0; padding: 20px; }
            h1, h2, h3, h4, h5, h6 { page-break-after: avoid; }
            pre, blockquote { page-break-inside: avoid; }
        }
    </style>
</head>
<body>
    ${content}
</body>
</html>`;
}

async function convertAll() {
    try {
        console.log('🔄 Universal Document Converter');
        console.log('==============================\n');

        // Get input file
        let inputFile = '';
        while (!inputFile) {
            inputFile = await askQuestion('Enter the path to your file: ');
            if (!inputFile) {
                console.log('❌ Please enter a valid file path.\n');
                continue;
            }
            
            if (!fs.existsSync(inputFile)) {
                console.log(`❌ File not found: ${inputFile}\n`);
                inputFile = '';
                continue;
            }
        }

        // Get output directory
        let outputDir = '';
        while (!outputDir) {
            outputDir = await askQuestion('Enter the output directory (or press Enter for current directory): ');
            if (!outputDir) {
                outputDir = '.';
            }
            
            // Create directory if it doesn't exist
            if (!fs.existsSync(outputDir)) {
                const createDir = await askQuestion(`Directory "${outputDir}" doesn't exist. Create it? (y/n): `);
                if (createDir.toLowerCase() === 'y' || createDir.toLowerCase() === 'yes') {
                    try {
                        fs.mkdirSync(outputDir, { recursive: true });
                        console.log(`✅ Created directory: ${outputDir}`);
                    } catch (error) {
                        console.log(`❌ Error creating directory: ${error.message}\n`);
                        outputDir = '';
                        continue;
                    }
                } else {
                    outputDir = '';
                    continue;
                }
            }
        }

        // Determine file type and available conversions
        const fileExt = path.extname(inputFile).toLowerCase();
        const fileName = path.basename(inputFile, fileExt);
        
        let availableConversions = [];
        let fileType = '';

        if (['.html', '.htm'].includes(fileExt)) {
            fileType = 'HTML';
            availableConversions = ['PDF', 'Word'];
        } else if (['.md', '.markdown', '.txt'].includes(fileExt)) {
            fileType = 'Markdown';
            availableConversions = ['PDF', 'HTML', 'Word'];
        } else if (['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp'].includes(fileExt)) {
            fileType = 'Image';
            availableConversions = ['Resize'];
        } else {
            console.log('❌ Unsupported file type. Supported formats: HTML, Markdown, Images');
            closeInterface();
            return;
        }

        console.log(`\n📁 File type detected: ${fileType}`);
        console.log('Available conversions:');
        availableConversions.forEach((conv, index) => {
            console.log(`   ${index + 1}. ${conv}`);
        });

        // Get conversion choice
        let conversionChoice = '';
        while (!conversionChoice) {
            const choice = await askQuestion(`\nSelect conversion (1-${availableConversions.length}): `);
            const choiceNum = parseInt(choice);
            if (choiceNum >= 1 && choiceNum <= availableConversions.length) {
                conversionChoice = availableConversions[choiceNum - 1];
            } else {
                console.log('❌ Please select a valid option.\n');
            }
        }

        // Get output filename
        let outputFilename = '';
        while (!outputFilename) {
            let defaultName = '';
            switch (conversionChoice) {
                case 'PDF':
                    defaultName = fileName + '.pdf';
                    break;
                case 'HTML':
                    defaultName = fileName + '.html';
                    break;
                case 'Word':
                    defaultName = fileName + '.docx';
                    break;
                case 'Resize':
                    defaultName = fileName + '-resized' + fileExt;
                    break;
            }
            
            outputFilename = await askQuestion(`Enter output filename (or press Enter for "${defaultName}"): `);
            if (!outputFilename) {
                outputFilename = defaultName;
            }
        }

        // Build full output path
        const outputFile = path.join(outputDir, outputFilename);

        // Check if output file already exists
        if (fs.existsSync(outputFile)) {
            const overwrite = await askQuestion(`File "${outputFile}" already exists. Overwrite? (y/n): `);
            if (overwrite.toLowerCase() !== 'y' && overwrite.toLowerCase() !== 'yes') {
                console.log('❌ Conversion cancelled.');
                closeInterface();
                return;
            }
        }

        console.log('\n🔄 Converting...');
        console.log(`   Input: ${inputFile}`);
        console.log(`   Output: ${outputFile}`);
        console.log(`   Conversion: ${fileType} → ${conversionChoice}`);

        // Perform conversion
        switch (conversionChoice) {
            case 'PDF':
                await convertToPdf(inputFile, outputFile, fileType);
                break;
            case 'HTML':
                await convertToHtml(inputFile, outputFile);
                break;
            case 'Word':
                await convertToWord(inputFile, outputFile, fileType);
                break;
            case 'Resize':
                await resizeImage(inputFile, outputFile);
                break;
        }
        
        // Ask if user wants to convert another file
        const convertAnother = await askQuestion('\nConvert another file? (y/n): ');
        if (convertAnother.toLowerCase() === 'y' || convertAnother.toLowerCase() === 'yes') {
            console.log('\n' + '='.repeat(50) + '\n');
            await convertAll();
        } else {
            console.log('\n👋 Thanks for using Universal Document Converter!');
        }
        
    } catch (error) {
        console.error('\n❌ Error:', error.message);
    } finally {
        closeInterface();
    }
}

async function convertToPdf(inputFile, outputFile, fileType) {
    let htmlContent = '';
    
    if (fileType === 'HTML') {
        htmlContent = fs.readFileSync(inputFile, 'utf-8');
    } else if (fileType === 'Markdown') {
        const markdownContent = fs.readFileSync(inputFile, 'utf-8');
        htmlContent = marked.parse(markdownContent);
    }
    
    // Create full HTML document
    const title = path.basename(inputFile, path.extname(inputFile));
    const fullHtml = createHtmlTemplate(htmlContent, title);

    // Launch browser
    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    
    // Set content and wait for it to load
    await page.setContent(fullHtml, { waitUntil: 'networkidle0' });
    
    // Generate PDF
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

    // Write PDF to file
    fs.writeFileSync(outputFile, pdfBuffer);
    
    console.log(`\n✅ PDF created successfully!`);
    console.log(`📊 File size: ${(pdfBuffer.length / 1024).toFixed(2)} KB`);
}

async function convertToHtml(inputFile, outputFile) {
    const markdownContent = fs.readFileSync(inputFile, 'utf-8');
    const htmlContent = marked.parse(markdownContent);
    
    // Create full HTML document
    const title = path.basename(inputFile, path.extname(inputFile));
    const fullHtml = createHtmlTemplate(htmlContent, title);

    // Write HTML to file
    fs.writeFileSync(outputFile, fullHtml);
    
    console.log(`\n✅ HTML file created successfully!`);
    console.log(`📊 File size: ${(fullHtml.length / 1024).toFixed(2)} KB`);
}

async function convertToWord(inputFile, outputFile, fileType) {
    let htmlContent = '';
    
    if (fileType === 'HTML') {
        htmlContent = fs.readFileSync(inputFile, 'utf-8');
    } else if (fileType === 'Markdown') {
        const markdownContent = fs.readFileSync(inputFile, 'utf-8');
        htmlContent = marked.parse(markdownContent);
    }
    
    // Note: This requires html-to-docx to be installed
    try {
        const htmlToDocx = require('html-to-docx');
        const fileBuffer = await htmlToDocx(htmlContent, {
            table: { row: { cantSplit: true } },
            footer: false,
            pageNumber: false,
            margins: {
                top: 1440,
                right: 1440,
                bottom: 1440,
                left: 1440,
                header: 720,
                footer: 720,
                gutter: 0
            }
        });

        fs.writeFileSync(outputFile, fileBuffer);
        
        console.log(`\n✅ Word document created successfully!`);
        console.log(`📊 File size: ${(fileBuffer.length / 1024).toFixed(2)} KB`);
    } catch (error) {
        console.log('\n❌ Word conversion failed. html-to-docx library may not be installed or compatible.');
        console.log('💡 Try using Pandoc instead: pandoc input.md -o output.docx');
    }
}

async function resizeImage(inputFile, outputFile) {
    // Get resize parameters
    const width = await askQuestion('Enter new width (or press Enter to keep aspect ratio): ');
    const height = await askQuestion('Enter new height (or press Enter to keep aspect ratio): ');
    const quality = await askQuestion('Enter quality (1-100, default 90): ') || '90';
    const format = await askQuestion('Enter format (jpeg/png/webp, default: same as input): ') || '';

    if (!width && !height) {
        console.log('❌ Please specify at least width or height.');
        return;
    }

    let sharpInstance = sharp(inputFile);

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
    const outputExt = path.extname(outputFile).toLowerCase();
    const finalFormat = format || (outputExt === '.jpg' || outputExt === '.jpeg' ? 'jpeg' : 
                                  outputExt === '.png' ? 'png' : 
                                  outputExt === '.webp' ? 'webp' : 'jpeg');

    switch (finalFormat.toLowerCase()) {
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
            console.log('❌ Unsupported format. Using JPEG.');
            outputBuffer = await sharpInstance.jpeg({ quality: parseInt(quality) }).toBuffer();
    }

    // Write resized image to file
    fs.writeFileSync(outputFile, outputBuffer);
    
    console.log(`\n✅ Image resized successfully!`);
    console.log(`📊 File size: ${(outputBuffer.length / 1024).toFixed(2)} KB`);
}

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
    console.log('\n\n👋 Conversion cancelled. Goodbye!');
    closeInterface();
    process.exit(0);
});

// Start the interactive conversion
convertAll(); 