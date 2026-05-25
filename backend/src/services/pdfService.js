import {
  PDFDocument,
  rgb,
  degrees,
  StandardFonts,
} from 'pdf-lib'
import fs from 'fs'

// Parse page numbers like "1,3,5" or "2-4"
export function parsePageRange(str, totalPages) {
  const set = new Set()
  const parts = str.split(',')
  
  parts.forEach(part => {
    part = part.trim()
    if (part.includes('-')) {
      const [start, end] = part.split('-').map(s => parseInt(s.trim()) - 1)
      const s = Math.max(0, start)
      const e = Math.min(totalPages - 1, end)
      for (let i = s; i <= e; i++) set.add(i)
    } else {
      const n = parseInt(part) - 1
      if (n >= 0 && n < totalPages) set.add(n)
    }
  })
  
  return set
}

export async function mergePDFs(files) {
  const merged = await PDFDocument.create()
  
  for (const filePath of files) {
    const bytes = fs.readFileSync(filePath)
    const pdf = await PDFDocument.load(bytes)
    const pages = await merged.copyPages(pdf, pdf.getPageIndices())
    pages.forEach(p => merged.addPage(p))
  }
  
  return await merged.save()
}

export async function splitPDF(filePath) {
  const bytes = fs.readFileSync(filePath)
  const pdf = await PDFDocument.load(bytes)
  const count = pdf.getPageCount()
  const results = []
  
  for (let i = 0; i < count; i++) {
    const single = await PDFDocument.create()
    const [page] = await single.copyPages(pdf, [i])
    single.addPage(page)
    results.push(await single.save())
  }
  
  return results
}

export async function rotatePDF(filePath, angle = 90) {
  const bytes = fs.readFileSync(filePath)
  const pdf = await PDFDocument.load(bytes)
  
  pdf.getPages().forEach(page => {
    page.setRotation(degrees(angle))
  })
  
  return await pdf.save()
}

export async function deletePages(filePath, pagesToDelete) {
  const bytes = fs.readFileSync(filePath)
  const pdf = await PDFDocument.load(bytes)
  const count = pdf.getPageCount()
  const deleteSet = pageRangeToSet(pagesToDelete, count)
  
  const keep = []
  for (let i = 0; i < count; i++) {
    if (!deleteSet.has(i)) keep.push(i)
  }
  
  const out = await PDFDocument.create()
  const pages = await out.copyPages(pdf, keep)
  pages.forEach(p => out.addPage(p))
  
  return await out.save()
}

export async function extractPages(filePath, pagesToExtract) {
  const bytes = fs.readFileSync(filePath)
  const pdf = await PDFDocument.load(bytes)
  const count = pdf.getPageCount()
  const extractSet = parsePageRange(pagesToExtract, count)
  const indices = [...extractSet].sort((a, b) => a - b)
  
  if (!indices.length) throw new Error('No valid pages to extract')
  
  const out = await PDFDocument.create()
  const pages = await out.copyPages(pdf, indices)
  pages.forEach(p => out.addPage(p))
  
  return await out.save()
}

export async function reorderPages(filePath, newOrder) {
  const bytes = fs.readFileSync(filePath)
  const pdf = await PDFDocument.load(bytes)
  const count = pdf.getPageCount()
  
  const indices = newOrder.split(',')
    .map(s => parseInt(s.trim()) - 1)
    .filter(n => n >= 0 && n < count)
  
  if (!indices.length) throw new Error('Invalid order')
  
  const out = await PDFDocument.create()
  const pages = await out.copyPages(pdf, indices)
  pages.forEach(p => out.addPage(p))
  
  return await out.save()
}

export async function compressPDF(filePath) {
  const bytes = fs.readFileSync(filePath)
  const pdf = await PDFDocument.load(bytes, { updateMetadata: false })
  
  return await pdf.save({
    useObjectStreams: true,
    addDefaultPage: false,
  })
}

export async function addWatermark(filePath, text, opacity = 0.25, color = 'gray') {
  const bytes = fs.readFileSync(filePath)
  const pdf = await PDFDocument.load(bytes)
  const font = await pdf.embedFont(StandardFonts.HelveticaBold)
  
  const colorMap = {
    gray: rgb(0.5, 0.5, 0.5),
    red: rgb(0.9, 0.1, 0.1),
    blue: rgb(0.1, 0.1, 0.9),
    green: rgb(0.1, 0.7, 0.1),
  }
  
  const col = colorMap[color] || colorMap.gray
  
  pdf.getPages().forEach(page => {
    const { width, height } = page.getSize()
    const fontSize = Math.min(width, height) * 0.08
    const textWidth = font.widthOfTextAtSize(text, fontSize)
    
    page.drawText(text, {
      x: width / 2 - textWidth / 2,
      y: height / 2 - fontSize / 2,
      size: fontSize,
      font,
      color: col,
      opacity,
      rotate: degrees(45),
    })
  })
  
  return await pdf.save()
}

export async function addPageNumbers(filePath, position = 'center', startNum = 1) {
  const bytes = fs.readFileSync(filePath)
  const pdf = await PDFDocument.load(bytes)
  const font = await pdf.embedFont(StandardFonts.Helvetica)
  
  pdf.getPages().forEach((page, i) => {
    const { width, height } = page.getSize()
    const text = `${startNum + i}`
    const fontSize = 11
    const textWidth = font.widthOfTextAtSize(text, fontSize)
    
    let x
    if (position === 'right') x = width - textWidth - 30
    else if (position === 'left') x = 30
    else x = width / 2 - textWidth / 2
    
    page.drawText(text, {
      x,
      y: 18,
      size: fontSize,
      font,
      color: rgb(0.3, 0.3, 0.3),
    })
  })
  
  return await pdf.save()
}

export async function editMetadata(filePath, metadata) {
  const bytes = fs.readFileSync(filePath)
  const pdf = await PDFDocument.load(bytes)
  
  if (metadata.title) pdf.setTitle(metadata.title)
  if (metadata.author) pdf.setAuthor(metadata.author)
  if (metadata.subject) pdf.setSubject(metadata.subject)
  if (metadata.keywords) pdf.setKeywords([metadata.keywords])
  
  pdf.setModificationDate(new Date())
  
  return await pdf.save()
}

// Helper
function pageRangeToSet(str, total) {
  return parsePageRange(str, total)
}
