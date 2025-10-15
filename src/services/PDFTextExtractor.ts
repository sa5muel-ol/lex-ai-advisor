import * as pdfjsLib from 'pdfjs-dist';
import { createWorker } from 'tesseract.js';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

interface ExtractionResult {
  text: string;
  method: 'direct' | 'ocr';
  pageCount: number;
}

class PDFTextExtractor {
  private ocrWorker: any = null;

  async extractTextFromPDF(file: File): Promise<ExtractionResult> {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const pageCount = pdf.numPages;

    // Try direct text extraction first
    let hasTextContent = false;
    let directText = '';

    for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      
      if (textContent.items.length > 0) {
        hasTextContent = true;
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ');
        directText += `\n\n--- Page ${pageNum} ---\n\n${pageText}`;
      }
    }

    // If text was found, return it
    if (hasTextContent && directText.trim().length > 100) {
      return {
        text: directText.trim(),
        method: 'direct',
        pageCount
      };
    }

    // Fallback to OCR for scanned PDFs
    console.log('No text content found, using OCR...');
    return await this.extractTextWithOCR(file, pdf, pageCount);
  }

  private async extractTextWithOCR(
    file: File,
    pdf: any,
    pageCount: number
  ): Promise<ExtractionResult> {
    // Initialize Tesseract worker
    if (!this.ocrWorker) {
      this.ocrWorker = await createWorker('eng');
    }

    let ocrText = '';
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('Failed to get canvas context');
    }

    // Process each page with OCR
    for (let pageNum = 1; pageNum <= Math.min(pageCount, 10); pageNum++) {
      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale: 2.0 }); // High resolution for better OCR

      canvas.width = viewport.width;
      canvas.height = viewport.height;

      await page.render({
        canvasContext: ctx,
        viewport: viewport
      }).promise;

      // Convert canvas to image and run OCR
      const imageData = canvas.toDataURL('image/png');
      const { data: { text } } = await this.ocrWorker.recognize(imageData);
      
      ocrText += `\n\n--- Page ${pageNum} ---\n\n${text}`;
    }

    return {
      text: ocrText.trim(),
      method: 'ocr',
      pageCount
    };
  }

  async terminateOCR() {
    if (this.ocrWorker) {
      await this.ocrWorker.terminate();
      this.ocrWorker = null;
    }
  }
}

export default PDFTextExtractor;
