import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, '..', 'public');
const imagesDir = path.join(publicDir, 'images');
const pdfPath = path.join(publicDir, 'catalog.pdf');

if (!fs.existsSync(imagesDir)) {
  fs.mkdirSync(imagesDir, { recursive: true });
}

const mockDataContent = fs.readFileSync(path.join(__dirname, '..', 'src', 'data', 'mockData.js'), 'utf8');
const pageRegex = /"page":\s*(\d+)/g;
let match;
const pagesToExtract = new Set();
while ((match = pageRegex.exec(mockDataContent)) !== null) {
  pagesToExtract.add(parseInt(match[1], 10));
}

const uniquePages = Array.from(pagesToExtract).sort((a,b)=>a-b);
console.log(`Starting extraction of ${uniquePages.length} unique pages from PDF...`);

async function run() {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  
  await page.setViewport({ width: 1200, height: 1600 });
  
  const pdfJsUrl = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
  const pdfWorkerUrl = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <script src="${pdfJsUrl}"></script>
    </head>
    <body>
      <canvas id="pdf-canvas"></canvas>
      <script>
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = '${pdfWorkerUrl}';
      </script>
    </body>
    </html>
  `;
  await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
  
  console.log('Loading PDF file into memory...');
  const pdfData = fs.readFileSync(pdfPath).toString('base64');
  
  console.log('Initializing PDF in browser context...');
  await page.evaluate(async (pdfBase64) => {
    const pdfDataUrl = 'data:application/pdf;base64,' + pdfBase64;
    const loadingTask = window.pdfjsLib.getDocument({ url: pdfDataUrl });
    window.pdfDoc = await loadingTask.promise;
    window.pdfCanvas = document.getElementById('pdf-canvas');
    window.pdfContext = window.pdfCanvas.getContext('2d');
  }, pdfData);
  
  for (let i = 0; i < uniquePages.length; i++) {
    const pageNum = uniquePages[i];
    const targetFile = path.join(imagesDir, `${pageNum}.jpg`);
    
    console.log(`[${i+1}/${uniquePages.length}] Extracting page ${pageNum} to image...`);
    
    try {
      const base64Data = await page.evaluate(async (num) => {
        if (num > window.pdfDoc.numPages) return null;
        const pdfPage = await window.pdfDoc.getPage(num);
        // We use 1.5 scale here to keep images somewhat lightweight but good quality
        const viewport = pdfPage.getViewport({ scale: 1.5 });
        window.pdfCanvas.height = viewport.height;
        window.pdfCanvas.width = viewport.width;
        
        const renderContext = {
          canvasContext: window.pdfContext,
          viewport: viewport
        };
        await pdfPage.render(renderContext).promise;
        return window.pdfCanvas.toDataURL('image/jpeg', 0.8).split(',')[1];
      }, pageNum);
      
      if (base64Data) {
        fs.writeFileSync(targetFile, Buffer.from(base64Data, 'base64'));
      }
    } catch (e) {
      console.error(`Error rendering page ${pageNum}: `, e.message);
    }
  }
  
  await browser.close();
  console.log('Finished extracting all requested pages!');
}

run().catch(console.error);
