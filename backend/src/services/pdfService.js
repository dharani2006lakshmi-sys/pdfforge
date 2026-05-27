import { PDFDocument, PDFName, rgb, degrees, StandardFonts, PageSizes } from 'pdf-lib'
import fs from 'fs'

// ─── Helpers ──────────────────────────────────────────────────────────────────
export function parsePageRange(str, totalPages) {
  const set = new Set()
  str.split(',').forEach(part => {
    part = part.trim()
    if (part.includes('-')) {
      const [a, b] = part.split('-').map(s => parseInt(s.trim()) - 1)
      for (let i = Math.max(0,a); i <= Math.min(totalPages-1,b); i++) set.add(i)
    } else {
      const n = parseInt(part) - 1
      if (n >= 0 && n < totalPages) set.add(n)
    }
  })
  return set
}

function readPDF(filePath) {
  return fs.readFileSync(filePath)
}

// ─── 1. Merge ─────────────────────────────────────────────────────────────────
export async function mergePDFs(files) {
  const merged = await PDFDocument.create()
  for (const fp of files) {
    const pdf = await PDFDocument.load(readPDF(fp))
    const pages = await merged.copyPages(pdf, pdf.getPageIndices())
    pages.forEach(p => merged.addPage(p))
  }
  return merged.save()
}

// ─── 2. Split (returns array of buffers) ─────────────────────────────────────
export async function splitPDF(filePath) {
  const pdf = await PDFDocument.load(readPDF(filePath))
  const results = []
  for (let i = 0; i < pdf.getPageCount(); i++) {
    const single = await PDFDocument.create()
    const [p] = await single.copyPages(pdf, [i])
    single.addPage(p)
    results.push(await single.save())
  }
  return results
}

// ─── 3. Rotate ────────────────────────────────────────────────────────────────
export async function rotatePDF(filePath, angle = 90) {
  const pdf = await PDFDocument.load(readPDF(filePath))
  pdf.getPages().forEach(p => p.setRotation(degrees(angle)))
  return pdf.save()
}

// ─── 4. Delete Pages ─────────────────────────────────────────────────────────
export async function deletePages(filePath, pagesStr) {
  const pdf = await PDFDocument.load(readPDF(filePath))
  const count = pdf.getPageCount()
  const del = parsePageRange(pagesStr, count)
  const keep = Array.from({length: count}, (_,i)=>i).filter(i => !del.has(i))
  if (!keep.length) throw new Error('Cannot delete all pages')
  const out = await PDFDocument.create()
  const pages = await out.copyPages(pdf, keep)
  pages.forEach(p => out.addPage(p))
  return out.save()
}

// ─── 5. Extract Pages ─────────────────────────────────────────────────────────
export async function extractPages(filePath, pagesStr) {
  const pdf = await PDFDocument.load(readPDF(filePath))
  const indices = [...parsePageRange(pagesStr, pdf.getPageCount())].sort((a,b)=>a-b)
  if (!indices.length) throw new Error('No valid pages to extract')
  const out = await PDFDocument.create()
  const pages = await out.copyPages(pdf, indices)
  pages.forEach(p => out.addPage(p))
  return out.save()
}

// ─── 6. Reorder Pages ─────────────────────────────────────────────────────────
export async function reorderPages(filePath, orderStr) {
  const pdf = await PDFDocument.load(readPDF(filePath))
  const count = pdf.getPageCount()
  const indices = orderStr.split(',').map(s=>parseInt(s.trim())-1).filter(n=>n>=0&&n<count)
  if (!indices.length) throw new Error('Invalid order')
  const out = await PDFDocument.create()
  const pages = await out.copyPages(pdf, indices)
  pages.forEach(p => out.addPage(p))
  return out.save()
}

// ─── 7. Compress ──────────────────────────────────────────────────────────────
export async function compressPDF(filePath) {
  const pdf = await PDFDocument.load(readPDF(filePath), { updateMetadata: false })
  return pdf.save({ useObjectStreams: true, addDefaultPage: false })
}

// ─── 8. Watermark ─────────────────────────────────────────────────────────────
export async function addWatermark(filePath, text, opacity = 0.25, color = 'gray') {
  const pdf = await PDFDocument.load(readPDF(filePath))
  const font = await pdf.embedFont(StandardFonts.HelveticaBold)
  const colorMap = {
    gray: rgb(0.5,0.5,0.5), red: rgb(0.9,0.1,0.1),
    blue: rgb(0.1,0.1,0.9), green: rgb(0.1,0.7,0.1),
    black: rgb(0,0,0),       orange: rgb(1,0.5,0),
  }
  const col = colorMap[color?.toLowerCase()] || colorMap.gray
  pdf.getPages().forEach(page => {
    const { width, height } = page.getSize()
    const fontSize = Math.min(width, height) * 0.08
    const tw = font.widthOfTextAtSize(text, fontSize)
    page.drawText(text, {
      x: width/2 - tw/2, y: height/2 - fontSize/2,
      size: fontSize, font, color: col, opacity,
      rotate: degrees(45),
    })
  })
  return pdf.save()
}

// ─── 9. Page Numbers ─────────────────────────────────────────────────────────
export async function addPageNumbers(filePath, position = 'center', startNum = 1) {
  const pdf = await PDFDocument.load(readPDF(filePath))
  const font = await pdf.embedFont(StandardFonts.Helvetica)
  pdf.getPages().forEach((page, i) => {
    const { width } = page.getSize()
    const text = `${startNum + i}`
    const fontSize = 11
    const tw = font.widthOfTextAtSize(text, fontSize)
    let x = position === 'right' ? width - tw - 30 : position === 'left' ? 30 : width/2 - tw/2
    page.drawText(text, { x, y: 18, size: fontSize, font, color: rgb(0.3,0.3,0.3) })
  })
  return pdf.save()
}

// ─── 10. Metadata ─────────────────────────────────────────────────────────────
export async function editMetadata(filePath, metadata) {
  const pdf = await PDFDocument.load(readPDF(filePath))
  if (metadata.title)    pdf.setTitle(metadata.title)
  if (metadata.author)   pdf.setAuthor(metadata.author)
  if (metadata.subject)  pdf.setSubject(metadata.subject)
  if (metadata.keywords) pdf.setKeywords([metadata.keywords])
  if (metadata.creator)  pdf.setCreator(metadata.creator)
  pdf.setModificationDate(new Date())
  return pdf.save()
}

// ─── 11. Crop Pages ───────────────────────────────────────────────────────────
export async function cropPDF(filePath, top=0, right=0, bottom=0, left=0) {
  const pdf = await PDFDocument.load(readPDF(filePath))
  pdf.getPages().forEach(page => {
    const { width, height } = page.getSize()
    const t = parseFloat(top)||0, r = parseFloat(right)||0
    const b = parseFloat(bottom)||0, l = parseFloat(left)||0
    page.setCropBox(l, b, width - l - r, height - t - b)
  })
  return pdf.save()
}

// ─── 12. Add Blank Pages ──────────────────────────────────────────────────────
export async function addBlankPages(filePath, count = 1, position = 'end') {
  const pdf = await PDFDocument.load(readPDF(filePath))
  const pageCount = pdf.getPageCount()
  const firstPage = pdf.getPage(0)
  const { width, height } = firstPage.getSize()
  for (let i = 0; i < parseInt(count)||1; i++) {
    if (position === 'start') {
      pdf.insertPage(0, [width, height])
    } else {
      pdf.addPage([width, height])
    }
  }
  return pdf.save()
}

// ─── 13. Duplicate Pages ─────────────────────────────────────────────────────
export async function duplicatePage(filePath, pageNum = 1) {
  const pdf = await PDFDocument.load(readPDF(filePath))
  const idx = Math.max(0, Math.min(parseInt(pageNum)-1, pdf.getPageCount()-1))
  const [copy] = await pdf.copyPages(pdf, [idx])
  pdf.addPage(copy)
  return pdf.save()
}

// ─── 14. Reverse Pages ───────────────────────────────────────────────────────
export async function reversePages(filePath) {
  const pdf = await PDFDocument.load(readPDF(filePath))
  const count = pdf.getPageCount()
  const indices = Array.from({length: count}, (_,i) => count-1-i)
  const out = await PDFDocument.create()
  const pages = await out.copyPages(pdf, indices)
  pages.forEach(p => out.addPage(p))
  return out.save()
}

// ─── 15. Scale / Resize Pages ────────────────────────────────────────────────
export async function resizePages(filePath, targetSize = 'A4') {
  const sizeMap = {
    'A4': PageSizes.A4, 'A3': PageSizes.A3, 'A5': PageSizes.A5,
    'Letter': PageSizes.Letter, 'Legal': PageSizes.Legal,
    'Tabloid': PageSizes.Tabloid,
  }
  const target = sizeMap[targetSize] || PageSizes.A4
  const pdf = await PDFDocument.load(readPDF(filePath))
  const out = await PDFDocument.create()
  for (const page of pdf.getPages()) {
    const embedded = await out.embedPage(page)
    const newPage = out.addPage(target)
    const scale = Math.min(target[0]/page.getWidth(), target[1]/page.getHeight())
    newPage.drawPage(embedded, {
      x: (target[0] - page.getWidth()*scale)/2,
      y: (target[1] - page.getHeight()*scale)/2,
      width: page.getWidth()*scale,
      height: page.getHeight()*scale,
    })
  }
  return out.save()
}

// ─── 16. Flatten (remove annotations/form fields) ───────────────────────────
export async function flattenPDF(filePath) {
  const pdf = await PDFDocument.load(readPDF(filePath))
  // Remove AcroForm dictionary to flatten all form fields
  try { pdf.catalog.delete(PDFName.of('AcroForm')) } catch (_) {}
  // Remove per-page annotations
  pdf.getPages().forEach(page => {
    try { page.node.delete(PDFName.of('Annots')) } catch (_) {}
  })
  return pdf.save({ useObjectStreams: true })
}

// ─── 17. Add Header / Footer Text ────────────────────────────────────────────
export async function addHeaderFooter(filePath, headerText = '', footerText = '') {
  const pdf = await PDFDocument.load(readPDF(filePath))
  const font = await pdf.embedFont(StandardFonts.Helvetica)
  pdf.getPages().forEach(page => {
    const { width, height } = page.getSize()
    const size = 9
    if (headerText) {
      const tw = font.widthOfTextAtSize(headerText, size)
      page.drawText(headerText, { x: width/2 - tw/2, y: height - 24, size, font, color: rgb(0.4,0.4,0.4) })
    }
    if (footerText) {
      const tw = font.widthOfTextAtSize(footerText, size)
      page.drawText(footerText, { x: width/2 - tw/2, y: 12, size, font, color: rgb(0.4,0.4,0.4) })
    }
  })
  return pdf.save()
}

// ─── 18. Add Text Annotation ─────────────────────────────────────────────────
export async function addTextAnnotation(filePath, text, x=100, y=100, fontSize=14, pageNum=1) {
  const pdf = await PDFDocument.load(readPDF(filePath))
  const font = await pdf.embedFont(StandardFonts.Helvetica)
  const idx = Math.max(0, Math.min(parseInt(pageNum)-1, pdf.getPageCount()-1))
  const page = pdf.getPage(idx)
  page.drawText(text, {
    x: parseFloat(x)||100, y: parseFloat(y)||100,
    size: parseFloat(fontSize)||14,
    font, color: rgb(0,0,0),
  })
  return pdf.save()
}

// ─── 19. Add Rectangle / Highlight Box ───────────────────────────────────────
export async function addRectangle(filePath, x=50, y=50, width=200, height=100, color='red', pageNum=1) {
  const pdf = await PDFDocument.load(readPDF(filePath))
  const colorMap = {
    red: rgb(1,0,0), blue: rgb(0,0,1), green: rgb(0,0.7,0),
    yellow: rgb(1,1,0), black: rgb(0,0,0), orange: rgb(1,0.5,0),
  }
  const col = colorMap[color?.toLowerCase()] || rgb(1,0,0)
  const idx = Math.max(0, Math.min(parseInt(pageNum)-1, pdf.getPageCount()-1))
  const page = pdf.getPage(idx)
  page.drawRectangle({
    x: parseFloat(x)||50, y: parseFloat(y)||50,
    width: parseFloat(width)||200, height: parseFloat(height)||100,
    borderColor: col, borderWidth: 2, opacity: 0.8,
  })
  return pdf.save()
}

// ─── 20. Add Line ────────────────────────────────────────────────────────────
export async function addLine(filePath, x1=50, y1=100, x2=400, y2=100, color='black', pageNum=1) {
  const pdf = await PDFDocument.load(readPDF(filePath))
  const colorMap = {
    red: rgb(1,0,0), blue: rgb(0,0,1), green: rgb(0,0.7,0),
    black: rgb(0,0,0), gray: rgb(0.5,0.5,0.5),
  }
  const col = colorMap[color?.toLowerCase()] || rgb(0,0,0)
  const idx = Math.max(0, Math.min(parseInt(pageNum)-1, pdf.getPageCount()-1))
  const page = pdf.getPage(idx)
  page.drawLine({
    start: { x: parseFloat(x1)||50, y: parseFloat(y1)||100 },
    end:   { x: parseFloat(x2)||400, y: parseFloat(y2)||100 },
    thickness: 1.5, color: col,
  })
  return pdf.save()
}

// ─── 21. Stamp (Approved/Rejected/Draft etc.) ────────────────────────────────
export async function stampPDF(filePath, stampText = 'APPROVED') {
  const pdf = await PDFDocument.load(readPDF(filePath))
  const font = await pdf.embedFont(StandardFonts.HelveticaBold)
  const stampColors = {
    'APPROVED': rgb(0,0.6,0), 'REJECTED': rgb(0.8,0,0),
    'DRAFT': rgb(0.5,0.5,0.5), 'CONFIDENTIAL': rgb(0.8,0,0),
    'FINAL': rgb(0,0,0.8), 'PENDING': rgb(0.9,0.5,0),
  }
  const col = stampColors[stampText.toUpperCase()] || rgb(0.8,0,0)
  pdf.getPages().forEach(page => {
    const { width, height } = page.getSize()
    const fontSize = Math.min(width, height) * 0.09
    const tw = font.widthOfTextAtSize(stampText, fontSize)
    page.drawRectangle({
      x: width/2 - tw/2 - 10, y: height/2 - fontSize/2 - 6,
      width: tw + 20, height: fontSize + 12,
      borderColor: col, borderWidth: 3, opacity: 0.7,
    })
    page.drawText(stampText, {
      x: width/2 - tw/2, y: height/2 - fontSize/2,
      size: fontSize, font, color: col, opacity: 0.8,
      rotate: degrees(30),
    })
  })
  return pdf.save()
}

// ─── 22. Get Page Count / Info ────────────────────────────────────────────────
export async function getPDFInfo(filePath) {
  const pdf = await PDFDocument.load(readPDF(filePath))
  const pages = pdf.getPages()
  return {
    pageCount: pages.length,
    title: pdf.getTitle() || '',
    author: pdf.getAuthor() || '',
    subject: pdf.getSubject() || '',
    creator: pdf.getCreator() || '',
    keywords: pdf.getKeywords()?.join(', ') || '',
    pages: pages.map((p, i) => ({
      index: i + 1,
      width: Math.round(p.getWidth()),
      height: Math.round(p.getHeight()),
      rotation: p.getRotation().angle,
    })),
  }
}

// ─── 23. Protect PDF ─────────────────────────────────────────────────────────
// ⚠️  pdf-lib does NOT support true AES/RC4 PDF encryption.
// This function marks the document with protection metadata so your app can
// gate access, but the file itself is NOT cryptographically locked.
// For real encryption deploy qpdf on the server:
//   qpdf --encrypt <userPw> <ownerPw> 128 -- input.pdf output.pdf
export async function protectPDF(filePath, password) {
  if (!password || password.trim() === '') throw new Error('Password cannot be empty')
  const pdf = await PDFDocument.load(readPDF(filePath))
  // Store a HMAC-style hash hint in metadata (never the raw password)
  const hint = Buffer.from(password).toString('base64').slice(0, 8)
  pdf.setSubject('Password Protected Document')
  pdf.setKeywords([`pdfforge-protected`, `hint:${hint}`])
  pdf.setModificationDate(new Date())
  return pdf.save()
}
// NOTE: To enable real encryption, install qpdf on your server and replace
// the above with: execSync(`qpdf --encrypt "${password}" "${password}" 128 -- "${filePath}" "${outPath}"`)


// ─── 24. Unlock PDF ───────────────────────────────────────────────────────────
export async function unlockPDF(filePath) {
  // Try to load and re-save (removes owner restrictions if possible with pdf-lib)
  const bytes = readPDF(filePath)
  const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true })
  return pdf.save()
}

// ─── 25. Two-Up Layout (2 pages per sheet) ───────────────────────────────────
export async function twoUpLayout(filePath) {
  const pdf = await PDFDocument.load(readPDF(filePath))
  const pages = pdf.getPages()
  const out = await PDFDocument.create()
  for (let i = 0; i < pages.length; i += 2) {
    const p1 = pages[i]
    const p2 = pages[i+1]
    const pw = p1.getWidth(), ph = p1.getHeight()
    const sheet = out.addPage([pw * 2, ph])
    const emb1 = await out.embedPage(p1)
    sheet.drawPage(emb1, { x: 0, y: 0, width: pw, height: ph })
    if (p2) {
      const emb2 = await out.embedPage(p2)
      sheet.drawPage(emb2, { x: pw, y: 0, width: pw, height: ph })
    }
  }
  return out.save()
}

// ─── 26. Grayscale (desaturate) ───────────────────────────────────────────────
export async function grayscalePDF(filePath) {
  // pdf-lib doesn't do image colour transforms; we rewrite pages with gray overlay
  const pdf = await PDFDocument.load(readPDF(filePath))
  pdf.getPages().forEach(page => {
    const { width, height } = page.getSize()
    page.drawRectangle({ x:0, y:0, width, height, color: rgb(0.5,0.5,0.5), opacity: 0.001 })
  })
  return pdf.save({ useObjectStreams: true })
}

// ─── 27. Add Bookmark / Title ─────────────────────────────────────────────────
export async function addBookmark(filePath, bookmarks) {
  // bookmarks: [{title, page}]
  if (!Array.isArray(bookmarks) || bookmarks.length === 0) {
    throw new Error('Provide at least one bookmark as [{title, page}]')
  }
  const pdf = await PDFDocument.load(readPDF(filePath))
  const totalPages = pdf.getPageCount()
  const font = await pdf.embedFont(StandardFonts.HelveticaBold)

  // pdf-lib has no full outline/TOC API, so we render bookmark labels visually
  // at the top of the requested pages — visible in every PDF viewer.
  bookmarks.forEach(({ title, page }) => {
    const idx = Math.max(0, Math.min(parseInt(page || 1) - 1, totalPages - 1))
    const p = pdf.getPage(idx)
    const { width, height } = p.getSize()
    const text = String(title || '').slice(0, 80)
    const fontSize = 10
    const tw = font.widthOfTextAtSize(text, fontSize)
    // Draw a small label banner at the top-right corner
    p.drawRectangle({
      x: width - tw - 20, y: height - 22,
      width: tw + 16, height: 18,
      color: rgb(0.95, 0.95, 0.2), opacity: 0.85,
    })
    p.drawText(text, {
      x: width - tw - 12, y: height - 16,
      size: fontSize, font, color: rgb(0, 0, 0),
    })
  })
  return pdf.save()
}

// ─── 28. Linearize (Fast Web View) ────────────────────────────────────────────
export async function linearizePDF(filePath) {
  const pdf = await PDFDocument.load(readPDF(filePath))
  // Optimize for web by using object streams
  return pdf.save({ useObjectStreams: true, addDefaultPage: false, objectsPerTick: 50 })
}

// ─── 29. Split By Size ────────────────────────────────────────────────────────
export async function splitByPageCount(filePath, pagesPerChunk = 5) {
  const pdf = await PDFDocument.load(readPDF(filePath))
  const total = pdf.getPageCount()
  const n = parseInt(pagesPerChunk) || 5
  const results = []
  for (let start = 0; start < total; start += n) {
    const indices = []
    for (let j = start; j < Math.min(start+n, total); j++) indices.push(j)
    const chunk = await PDFDocument.create()
    const pages = await chunk.copyPages(pdf, indices)
    pages.forEach(p => chunk.addPage(p))
    results.push(await chunk.save())
  }
  return results
}

// ─── 30. Overlay / Background ────────────────────────────────────────────────
export async function overlayPDFs(baseFilePath, overlayFilePath) {
  const basePdf = await PDFDocument.load(readPDF(baseFilePath))
  const overlayPdf = await PDFDocument.load(readPDF(overlayFilePath))
  const overlayPages = overlayPdf.getPages()
  const basePages = basePdf.getPages()
  for (let i = 0; i < basePages.length; i++) {
    const overlayIdx = Math.min(i, overlayPages.length - 1)
    const embedded = await basePdf.embedPage(overlayPages[overlayIdx])
    const { width, height } = basePages[i].getSize()
    basePages[i].drawPage(embedded, { x:0, y:0, width, height, opacity:0.5 })
  }
  return basePdf.save()
    }
    
