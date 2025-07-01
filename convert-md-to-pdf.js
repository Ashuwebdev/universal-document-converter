#!/usr/bin/env node

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { marked } = require('marked');

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
    return `
<!DOCTYPE html>
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
        
        .highlight {
            background: #fff3cd;
            padding: 15px;
            border-left: 4px solid #ffc107;
            margin: 20px 0;
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

async function convertMarkdownToPdf() {
    try {
        console.log('📄 Markdown to PDF Converter');
        console.log('============================\n');

        // Get input file
        let inputFile = '';
        while (!inputFile) {
            inputFile = await askQuestion('Enter the path to your Markdown file: ');
            if (!inputFile) {
                console.log('❌ Please enter a valid file path.\n');
                continue;
            }
            
            if (!fs.existsSync(inputFile)) {
                console.log(`❌ File not found: ${inputFile}\n`);
                inputFile = '';
                continue;
            }
            
            // Check if it's a markdown file
            const ext = path.extname(inputFile).toLowerCase();
            if (!['.md', '.markdown', '.txt'].includes(ext)) {
                console.log('⚠️  Warning: File does not have a .md extension. Continue anyway? (y/n): ');
                const continueAnyway = await askQuestion('');
                if (continueAnyway.toLowerCase() !== 'y' && continueAnyway.toLowerCase() !== 'yes') {
                    inputFile = '';
                    continue;
                }
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

        // Get output filename
        let outputFilename = '';
        while (!outputFilename) {
            const defaultName = path.basename(inputFile, path.extname(inputFile)) + '.pdf';
            outputFilename = await askQuestion(`Enter output filename (or press Enter for "${defaultName}"): `);
            if (!outputFilename) {
                outputFilename = defaultName;
            }
            
            // Add .pdf extension if not provided
            if (!outputFilename.toLowerCase().endsWith('.pdf')) {
                outputFilename += '.pdf';
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

        console.log('\n🔄 Converting Markdown to PDF...');
        console.log(`   Input: ${inputFile}`);
        console.log(`   Output: ${outputFile}`);

        // Read Markdown content
        const markdownContent = fs.readFileSync(inputFile, 'utf-8');
        
        // Convert Markdown to HTML
        const htmlContent = marked(markdownContent);
        
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
        console.log(`📁 Location: ${outputFile}`);
        console.log(`📊 File size: ${(pdfBuffer.length / 1024).toFixed(2)} KB`);
        
        // Ask if user wants to convert another file
        const convertAnother = await askQuestion('\nConvert another file? (y/n): ');
        if (convertAnother.toLowerCase() === 'y' || convertAnother.toLowerCase() === 'yes') {
            console.log('\n' + '='.repeat(50) + '\n');
            await convertMarkdownToPdf();
        } else {
            console.log('\n👋 Thanks for using Markdown to PDF Converter!');
        }
        
    } catch (error) {
        console.error('\n❌ Error converting Markdown to PDF:', error.message);
    } finally {
        closeInterface();
    }
}

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
    console.log('\n\n👋 Conversion cancelled. Goodbye!');
    closeInterface();
    process.exit(0);
});

// Start the interactive conversion
convertMarkdownToPdf(); 