#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { exec } = require('child_process');
const util = require('util');

const execAsync = util.promisify(exec);

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

// Check if Pandoc is installed
async function checkPandoc() {
    try {
        await execAsync('pandoc --version');
        return true;
    } catch (error) {
        return false;
    }
}

async function convertPdfToWord() {
    try {
        console.log('📄 PDF to Word Converter');
        console.log('=======================\n');

        // Check if Pandoc is installed
        const pandocInstalled = await checkPandoc();
        if (!pandocInstalled) {
            console.log('❌ Pandoc is not installed.');
            console.log('\nTo install Pandoc on macOS:');
            console.log('  brew install pandoc');
            console.log('\nOr download from: https://pandoc.org/installing.html');
            console.log('\nAfter installing Pandoc, run this script again.');
            closeInterface();
            return;
        }

        // Get input file
        let inputFile = '';
        while (!inputFile) {
            inputFile = await askQuestion('Enter the path to your PDF file: ');
            if (!inputFile) {
                console.log('❌ Please enter a valid file path.\n');
                continue;
            }
            
            if (!fs.existsSync(inputFile)) {
                console.log(`❌ File not found: ${inputFile}\n`);
                inputFile = '';
                continue;
            }
            
            // Check if it's a PDF file
            const ext = path.extname(inputFile).toLowerCase();
            if (ext !== '.pdf') {
                console.log('⚠️  Warning: File does not have a .pdf extension. Continue anyway? (y/n): ');
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

        console.log('\n🔄 Converting PDF to Word document...');
        console.log(`   Input: ${inputFile}`);
        console.log(`   Output: ${outputFile}`);

        // Convert PDF to Word using Pandoc
        const command = `pandoc "${inputFile}" -o "${outputFile}"`;
        
        try {
            const { stdout, stderr } = await execAsync(command);
            
            if (stderr) {
                console.log('⚠️  Warning messages:', stderr);
            }
            
            console.log(`\n✅ Word document created successfully!`);
            console.log(`📁 Location: ${outputFile}`);
            
            // Check file size
            const stats = fs.statSync(outputFile);
            console.log(`📊 File size: ${(stats.size / 1024).toFixed(2)} KB`);
            
        } catch (error) {
            console.error('\n❌ Error during conversion:', error.message);
            console.log('\n💡 Tips:');
            console.log('- Make sure the PDF is not password protected');
            console.log('- Try with a simpler PDF first');
            console.log('- Some PDFs with complex layouts may not convert perfectly');
        }
        
        // Ask if user wants to convert another file
        const convertAnother = await askQuestion('\nConvert another file? (y/n): ');
        if (convertAnother.toLowerCase() === 'y' || convertAnother.toLowerCase() === 'yes') {
            console.log('\n' + '='.repeat(50) + '\n');
            await convertPdfToWord();
        } else {
            console.log('\n👋 Thanks for using PDF to Word Converter!');
        }
        
    } catch (error) {
        console.error('\n❌ Error:', error.message);
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
convertPdfToWord(); 