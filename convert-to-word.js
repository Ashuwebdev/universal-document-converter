#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// We'll use html-to-docx for Word conversion
let htmlToDocx;

try {
    // Try to require the library
    htmlToDocx = require('html-to-docx');
} catch (error) {
    console.log('📝 HTML to Word Converter');
    console.log('==========================\n');
    console.log('❌ Required dependencies not found.');
    console.log('Please install the required package first:\n');
    console.log('npm install html-to-docx\n');
    console.log('Or run: npm install --save html-to-docx\n');
    process.exit(1);
}

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

async function convertHtmlToWord() {
    try {
        console.log('📝 HTML to Word Converter');
        console.log('==========================\n');

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
            const defaultName = path.basename(inputFile, path.extname(inputFile)) + '.docx';
            outputFilename = await askQuestion(`Enter output filename (or press Enter for "${defaultName}"): `);
            if (!outputFilename) {
                outputFilename = defaultName;
            }
            
            // Add .docx extension if not provided
            if (!outputFilename.toLowerCase().endsWith('.docx')) {
                outputFilename += '.docx';
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

        console.log('\n🔄 Converting HTML to Word document...');
        console.log(`   Input: ${inputFile}`);
        console.log(`   Output: ${outputFile}`);

        // Read HTML content
        const htmlContent = fs.readFileSync(inputFile, 'utf-8');

        // Convert HTML to Word document
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

        // Write Word document to file
        fs.writeFileSync(outputFile, fileBuffer);
        
        console.log(`\n✅ Word document created successfully!`);
        console.log(`📁 Location: ${outputFile}`);
        console.log(`📊 File size: ${(fileBuffer.length / 1024).toFixed(2)} KB`);
        
        // Ask if user wants to convert another file
        const convertAnother = await askQuestion('\nConvert another file? (y/n): ');
        if (convertAnother.toLowerCase() === 'y' || convertAnother.toLowerCase() === 'yes') {
            console.log('\n' + '='.repeat(50) + '\n');
            await convertHtmlToWord();
        } else {
            console.log('\n👋 Thanks for using HTML to Word Converter!');
        }
        
    } catch (error) {
        console.error('\n❌ Error converting HTML to Word:', error.message);
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
convertHtmlToWord(); 