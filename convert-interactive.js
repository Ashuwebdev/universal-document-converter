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

async function convertHtmlToPdf() {
    try {
        console.log('📄 HTML to PDF Converter - Interactive Mode');
        console.log('==========================================\n');

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