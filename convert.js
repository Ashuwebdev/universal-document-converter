#!/usr/bin/env node

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// Get command line arguments
const args = process.argv.slice(2);

if (args.length === 0) {
    console.log('📄 HTML to PDF Converter');
    console.log('');
    console.log('Usage: node convert.js <input.html> [output.pdf] [--dir <directory>]');
    console.log('');
    console.log('Examples:');
    console.log('  node convert.js document.html');
    console.log('  node convert.js document.html output.pdf');
    console.log('  node convert.js document.html --dir ./pdfs/');
    console.log('  node convert.js document.html output.pdf --dir /path/to/output/');
    console.log('  node convert.js /path/to/document.html /path/to/output.pdf');
    console.log('');
    process.exit(1);
}

let inputFile = '';
let outputFile = '';
let outputDir = '';

// Parse arguments
for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--dir' || arg === '-d') {
        outputDir = args[++i] || '';
    } else if (arg.startsWith('--')) {
        console.error(`❌ Unknown option: ${arg}`);
        process.exit(1);
    } else if (!inputFile) {
        inputFile = arg;
    } else if (!outputFile) {
        outputFile = arg;
    }
}

if (!outputFile) {
    outputFile = inputFile.replace(/\.(html|htm)$/i, '.pdf');
}

// Apply output directory if specified
if (outputDir) {
    // Create directory if it doesn't exist
    if (!fs.existsSync(outputDir)) {
        try {
            fs.mkdirSync(outputDir, { recursive: true });
            console.log(`📁 Created output directory: ${outputDir}`);
        } catch (error) {
            console.error(`❌ Error creating directory: ${error.message}`);
            process.exit(1);
        }
    }
    
    // Get just the filename from the output path
    const filename = path.basename(outputFile);
    outputFile = path.join(outputDir, filename);
}

async function convertHtmlToPdf() {
    try {
        // Check if input file exists
        if (!fs.existsSync(inputFile)) {
            console.error(`❌ Error: Input file "${inputFile}" not found`);
            process.exit(1);
        }

        console.log(`📖 Reading HTML file: ${inputFile}`);
        const htmlContent = fs.readFileSync(inputFile, 'utf-8');

        console.log(`🔄 Converting to PDF...`);
        if (outputDir) {
            console.log(`📁 Output directory: ${outputDir}`);
        }
        
        // Launch browser
        const browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox']
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

        // Write PDF to file
        fs.writeFileSync(outputFile, pdfBuffer);
        
        console.log(`✅ PDF created successfully: ${outputFile}`);
        console.log(`📊 File size: ${(pdfBuffer.length / 1024).toFixed(2)} KB`);
        
    } catch (error) {
        console.error('❌ Error converting HTML to PDF:', error.message);
        process.exit(1);
    }
}

// Run the conversion
convertHtmlToPdf(); 