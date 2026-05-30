import fs from 'fs'
import path from 'path'
import mammoth from 'mammoth'
import puppeteer from 'puppeteer'
import { Document, Packer, Paragraph, TextRun } from 'docx'
import pdfParse from 'pdf-parse'
import ExcelJS from 'exceljs'
import pptxgen from 'pptxgenjs'
import { PDFDocument, StandardFonts } from 'pdf-lib'

function read(p) { return fs.readFileSync(p) }

// word2pdf
export async function word2pdf(filePath) {
  const result = await mammoth.convertToHtml({ path: filePath });
  const html = result.value || '<html><body><p>Empty document</p></body></html>';
  
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle0' });
  const pdfBuf = await page.pdf({ format: 'A4', margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' } });
  await browser.close();
  return pdfBuf;
}

// pdf2word
export async function pdf2word(filePath) {
  const data = await pdfParse(read(filePath));
  const lines = data.text.split('\n');
  
  const doc = new Document({
    sections: [{
      properties: {},
      children: lines.map(l => new Paragraph({ children: [new TextRun(l)] }))
    }]
  });
  const buf = await Packer.toBuffer(doc);
  return buf;
}

// pdf2excel
export async function pdf2excel(filePath) {
  const data = await pdfParse(read(filePath));
  const lines = data.text.split('\n').filter(l => l.trim().length > 0);
  
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Extracted Data');
  
  lines.forEach(line => {
    const cols = line.split(/\s{2,}|\t/).filter(c => c.trim().length > 0);
    if(cols.length > 0) sheet.addRow(cols);
    else sheet.addRow([line]);
  });
  
  const buf = await workbook.xlsx.writeBuffer();
  return Buffer.from(buf);
}

// pdf2ppt
export async function pdf2ppt(filePath) {
  const data = await pdfParse(read(filePath));
  const lines = data.text.split('\n').filter(l => l.trim().length > 0);
  
  const pptx = new pptxgen();
  let currentSlide = pptx.addSlide();
  let y = 1;
  lines.forEach((line, i) => {
    if (i > 0 && i % 15 === 0) {
      currentSlide = pptx.addSlide();
      y = 1;
    }
    currentSlide.addText(line.slice(0, 100), { x: 0.5, y: y * 0.3, fontSize: 12 });
    y++;
  });
  
  const buf = await pptx.write({ outputType: 'nodebuffer' });
  return buf;
}

// html2pdf
export async function html2pdf(url) {
  let finalUrl = url;
  if (!/^https?:\/\//i.test(finalUrl)) {
    finalUrl = 'http://' + finalUrl;
  }
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.goto(finalUrl, { waitUntil: 'networkidle2' });
  const pdfBuf = await page.pdf({ format: 'A4' });
  await browser.close();
  return pdfBuf;
}

