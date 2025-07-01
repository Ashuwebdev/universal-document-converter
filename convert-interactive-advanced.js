#!/usr/bin/env node

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

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

// Available page formats
const availableFormats = ['A4', 'A3', 'A5', 'Letter', 'Legal', 'Tabloid'];

async function convertHtmlToPdf() {
    try {
        console.log('📄 HTML to PDF Converter - Advanced Interactive Mode');
        console.log('==================================================\n');

        // Get input file
        let inputFile = '';
        while (!inputFile) {
            inputFile = await askQuestion('Enter the path to your HTML file: ');
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

        // Get page format
        console.log('\n📄 Available page formats:');
        availableFormats.forEach((format, index) => {
            console.log(`   ${index + 1}. ${format}`);
        });
        
        let pageFormat = 'A4';
        const formatChoice = await askQuestion(`\nSelect page format (1-${availableFormats.length}) or press Enter for A4: `);
        if (formatChoice && !isNaN(formatChoice) && formatChoice >= 1 && formatChoice <= availableFormats.length) {
            pageFormat = availableFormats[parseInt(formatChoice) - 1];
        }

        // Get page margins
        let pageMargin = '20px';
        const marginInput = await askQuestion('Enter page margins (e.g., 20px, 1in, 2cm) or press Enter for 20px: ');
        if (marginInput) {
            pageMargin = marginInput;
        }

        // Get orientation
        let landscape = false;
        const orientationChoice = await askQuestion('Page orientation - Portrait (p) or Landscape (l)? Press Enter for Portrait: ');
        if (orientationChoice.toLowerCase() === 'l' || orientationChoice.toLowerCase() === 'landscape') {
            landscape = true;
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

        console.log('\n🔄 Converting HTML to PDF...');
        console.log(`   Input: ${inputFile}`);
        console.log(`   Output: ${outputFile}`);
        console.log(`   Format: ${pageFormat}`);
        console.log(`   Margins: ${pageMargin}`);
        console.log(`   Orientation: ${landscape ? 'Landscape' : 'Portrait'}`);

        // Read HTML content
        const htmlContent = fs.readFileSync(inputFile, 'utf-8');

        // Launch browser
        const browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        const page = await browser.newPage();
        
        // Set content and wait for it to load
        await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
        
        // Parse margin
        const margin = {
            top: pageMargin,
            right: pageMargin,
            bottom: pageMargin,
            left: pageMargin
        };
        
        // Generate PDF with editable text
        const pdfBuffer = await page.pdf({
            format: pageFormat,
            landscape: landscape,
            printBackground: true,
            margin: margin,
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
            await convertHtmlToPdf();
        } else {
            console.log('\n👋 Thanks for using HTML to PDF Converter!');
        }
        
    } catch (error) {
        console.error('\n❌ Error converting HTML to PDF:', error.message);
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
convertHtmlToPdf(); 