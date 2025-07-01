#!/usr/bin/env node

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// Parse command line arguments
const args = process.argv.slice(2);

// Default options
const options = {
    format: 'A4',
    margin: '20px',
    landscape: false,
    printBackground: true,
    preferCSSPageSize: true
};

let inputFile = '';
let outputFile = '';
let outputDir = '';

// Parse arguments
for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--help' || arg === '-h') {
        showHelp();
        process.exit(0);
    } else if (arg === '--format' || arg === '-f') {
        options.format = args[++i] || 'A4';
    } else if (arg === '--margin' || arg === '-m') {
        options.margin = args[++i] || '20px';
    } else if (arg === '--landscape' || arg === '-l') {
        options.landscape = true;
    } else if (arg === '--output' || arg === '-o') {
        outputFile = args[++i];
    } else if (arg === '--dir' || arg === '-d') {
        outputDir = args[++i] || '';
    } else if (arg.startsWith('-')) {
        console.error(`❌ Unknown option: ${arg}`);
        showHelp();
        process.exit(1);
    } else if (!inputFile) {
        inputFile = arg;
    } else if (!outputFile) {
        outputFile = arg;
    }
}

if (!inputFile) {
    console.error('❌ Error: Input HTML file is required');
    showHelp();
    process.exit(1);
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

function showHelp() {
    console.log('📄 Advanced HTML to PDF Converter');
    console.log('');
    console.log('Usage: node convert-advanced.js <input.html> [options]');
    console.log('');
    console.log('Arguments:');
    console.log('  input.html              Input HTML file path');
    console.log('');
    console.log('Options:');
    console.log('  -o, --output <file>     Output PDF file path');
    console.log('  -d, --dir <directory>   Output directory for PDF file');
    console.log('  -f, --format <size>     Page format (A4, A3, Letter, Legal, etc.)');
    console.log('  -m, --margin <size>     Page margins (e.g., 20px, 1in)');
    console.log('  -l, --landscape         Landscape orientation');
    console.log('  -h, --help              Show this help message');
    console.log('');
    console.log('Examples:');
    console.log('  node convert-advanced.js document.html');
    console.log('  node convert-advanced.js document.html -o output.pdf');
    console.log('  node convert-advanced.js document.html --dir ./pdfs/');
    console.log('  node convert-advanced.js document.html --format Letter --margin 1in --dir ./output/');
    console.log('  node convert-advanced.js document.html --landscape --format A3 --dir /path/to/pdfs/');
    console.log('');
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
        console.log(`   Format: ${options.format}`);
        console.log(`   Margin: ${options.margin}`);
        console.log(`   Landscape: ${options.landscape ? 'Yes' : 'No'}`);
        if (outputDir) {
            console.log(`   Output directory: ${outputDir}`);
        }
        
        // Launch browser
        const browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        const page = await browser.newPage();
        
        // Set content and wait for it to load
        await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
        
        // Parse margin
        const marginValue = options.margin;
        const margin = {
            top: marginValue,
            right: marginValue,
            bottom: marginValue,
            left: marginValue
        };
        
        // Generate PDF with editable text
        const pdfBuffer = await page.pdf({
            format: options.format,
            landscape: options.landscape,
            printBackground: options.printBackground,
            margin: margin,
            preferCSSPageSize: options.preferCSSPageSize
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