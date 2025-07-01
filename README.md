# Universal Document Converter

A powerful web application and command-line tools for converting between various document formats and resizing images.

## 🌐 Live Demo

[Add your deployed URL here once deployed]

## Features

### Web Interface
- **Rich Text Editor**: Create and edit HTML content with a WYSIWYG editor
- **Markdown Editor**: Write and preview Markdown content
- **File Upload**: Upload HTML and Markdown files for conversion
- **Image Resizer**: Upload and resize images with custom dimensions and quality
- **Live Preview**: See your content as you type
- **Multiple Export Formats**: Convert to PDF, HTML, or Word documents

### Supported Conversions
- **HTML → PDF**: Convert HTML files to editable PDFs
- **Markdown → PDF**: Convert Markdown files to PDFs
- **Markdown → HTML**: Convert Markdown to formatted HTML
- **HTML/Markdown → Word**: Export to Word documents
- **Image Resizing**: Resize JPG, PNG, WebP images with custom dimensions

## 🚀 Quick Start

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/universal-document-converter.git
   cd universal-document-converter
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the server**
   ```bash
   npm start
   ```

4. **Open your browser**
   Navigate to `http://localhost:3000`

### Deployment Options

#### Option 1: Render (Recommended - Free)
1. Fork this repository to your GitHub account
2. Go to [render.com](https://render.com) and sign up
3. Click "New +" → "Web Service"
4. Connect your GitHub repository
5. Configure:
   - **Name**: `universal-document-converter`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
6. Click "Create Web Service"
7. Wait for deployment (usually 2-3 minutes)

#### Option 2: Railway
1. Fork this repository to your GitHub account
2. Go to [railway.app](https://railway.app) and sign up
3. Click "New Project" → "Deploy from GitHub repo"
4. Select your repository
5. Railway will automatically detect it's a Node.js app
6. Deploy and get your live URL

#### Option 3: Heroku
1. Fork this repository to your GitHub account
2. Go to [heroku.com](https://heroku.com) and sign up
3. Click "New" → "Create new app"
4. Connect your GitHub repository
5. Enable automatic deploys
6. Deploy the app

## 📁 Project Structure

```
universal-document-converter/
├── public/
│   └── index.html          # Web interface
├── server.js               # Express server
├── convert-all.js          # Universal CLI converter
├── convert.js              # Basic HTML to PDF
├── convert-advanced.js     # Advanced HTML to PDF
├── convert-interactive.js  # Interactive HTML to PDF
├── convert-md-to-pdf.js    # Markdown to PDF
├── convert-md-to-html.js   # Markdown to HTML
├── convert-to-word.js      # HTML to Word
├── convert-pdf-to-word.js  # PDF to Word
├── package.json
├── .gitignore
└── README.md
```

## 🛠️ Development

### Prerequisites
- Node.js 14 or higher
- npm or yarn

### Available Scripts
- `npm start` - Start the production server
- `npm run dev` - Start development server with auto-restart (if nodemon is installed)

### Environment Variables
Create a `.env` file for local development:
```env
PORT=3000
NODE_ENV=development
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Puppeteer](https://pptr.dev/) for PDF generation
- [Sharp](https://sharp.pixelplumbing.com/) for image processing
- [Marked](https://marked.js.org/) for Markdown parsing
- [Express](https://expressjs.com/) for the web framework

## 📞 Support

If you encounter any issues or have questions:
1. Check the [Issues](https://github.com/yourusername/universal-document-converter/issues) page
2. Create a new issue with detailed information
3. Include your Node.js version and operating system

## Installation

1. Clone or download this repository
2. Install dependencies:
   ```bash
   npm install
   ```

## Usage

### Web Application

1. Start the server:
   ```bash
   npm start
   ```

2. Open your browser and go to `http://localhost:3000`

3. Use the different tabs:
   - **Rich Text Editor**: Create HTML content and convert to PDF/Word
   - **Markdown Editor**: Write Markdown and convert to PDF/HTML/Word
   - **Upload Files**: Upload existing HTML or Markdown files
   - **Image Resizer**: Upload and resize images
   - **Preview**: See the final output before conversion

### Command Line Tools

#### Universal Converter (Recommended)
```bash
node convert-all.js
```
This interactive tool supports all conversions:
- HTML → PDF
- Markdown → PDF  
- Markdown → HTML
- HTML/Markdown → Word
- Image resizing

#### Individual Tools

**HTML to PDF:**
```bash
node convert.js input.html output.pdf
```

**Advanced HTML to PDF:**
```bash
node convert-advanced.js input.html output.pdf --format A4 --margin 20 --orientation portrait
```

**Interactive HTML to PDF:**
```bash
node convert-interactive.js
```

**Markdown to PDF:**
```bash
node convert-md-to-pdf.js
```

**Markdown to HTML:**
```bash
node convert-md-to-html.js
```

**HTML to Word:**
```bash
node convert-to-word.js
```

**PDF to Word (requires Pandoc):**
```bash
node convert-pdf-to-word.js
```

## Image Resizing Features

The image resizer supports:
- **Formats**: JPG, PNG, WebP, GIF, BMP
- **Resize Options**: Width, height, or both (maintains aspect ratio)
- **Quality Control**: Adjustable quality (1-100%)
- **Format Conversion**: Convert between different image formats
- **Batch Processing**: Resize multiple images

### Web Interface
1. Go to the "Image Resizer" tab
2. Upload an image
3. Set desired dimensions and quality
4. Choose output format
5. Click "Resize Image" to download

### Command Line
```bash
node convert-all.js
# Select an image file
# Choose "Resize" conversion
# Enter dimensions and quality
```

## Advanced Options

### PDF Generation Options
- **Page Size**: A4, Letter, Legal, etc.
- **Margins**: Customizable margins
- **Orientation**: Portrait or Landscape
- **Background**: Include or exclude background colors/images

### Image Resizing Options
- **Dimensions**: Specify width, height, or both
- **Aspect Ratio**: Automatically maintained when only one dimension is specified
- **Quality**: 1-100% for JPEG/WebP
- **Format**: Convert between JPEG, PNG, WebP

## Dependencies

- **Express**: Web server framework
- **Puppeteer**: PDF generation from HTML
- **Marked**: Markdown to HTML conversion
- **Sharp**: Image processing and resizing
- **html-to-docx**: HTML to Word conversion
- **Multer**: File upload handling

## Troubleshooting

### Word Export Issues
If Word export fails, try using Pandoc:
```bash
# Install Pandoc first
pandoc input.md -o output.docx
```

### Image Resizing Issues
- Ensure the image file is not corrupted
- Check that the dimensions are reasonable (not too large)
- Try different output formats if one fails

### PDF Generation Issues
- Make sure Puppeteer can launch Chrome
- Check that the HTML content is valid
- Try reducing the content size if it's very large

## File Structure

```
pdf/
├── public/
│   └── index.html          # Web interface
├── server.js               # Express server
├── convert-all.js          # Universal CLI converter
├── convert.js              # Basic HTML to PDF
├── convert-advanced.js     # Advanced HTML to PDF
├── convert-interactive.js  # Interactive HTML to PDF
├── convert-md-to-pdf.js    # Markdown to PDF
├── convert-md-to-html.js   # Markdown to HTML
├── convert-to-word.js      # HTML to Word
├── convert-pdf-to-word.js  # PDF to Word
├── package.json
└── README.md
```

## Examples

### Sample Files
- `sample.html`: Example HTML file
- `sample.md`: Example Markdown file
- `sample.pdf`: Example PDF output

### Web Interface Workflow
1. Start server: `npm start`
2. Open browser: `http://localhost:3000`
3. Choose editor tab (Rich Text or Markdown)
4. Write or paste content
5. Click conversion button
6. Download the converted file

### CLI Workflow
1. Run universal converter: `node convert-all.js`
2. Enter input file path
3. Choose output directory
4. Select conversion type
5. Enter output filename
6. Wait for conversion to complete

## Contributing

Feel free to submit issues and enhancement requests!

## License

This project is open source and available under the MIT License. 