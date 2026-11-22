export interface PdfTextItem {
  str?: string;
  transform?: number[];
  hasEOL?: boolean;
}

export async function extractTextFromPdfContent(pdfDoc: {
  numPages: number;
  getPage: (pageNumber: number) => Promise<{
    getTextContent: () => Promise<{ items: Array<PdfTextItem> }>;
  }>;
}): Promise<string> {
  let fullText = '';

  for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
    const page = await pdfDoc.getPage(pageNum);
    const content = await page.getTextContent();
    let pageText = '';
    let lastY: number | null = null;

    for (const item of content.items) {
      const str = item.str || '';
      const y = Array.isArray(item.transform) ? item.transform[5] : null;

      // When vertical position changes significantly or hasEOL flag is true, insert newline
      if (lastY !== null && y !== null && (Math.abs(y - lastY) > 4 || item.hasEOL)) {
        if (!pageText.endsWith('\n')) {
          pageText += '\n';
        }
      } else if (str && pageText.length > 0 && !pageText.endsWith('\n') && !pageText.endsWith(' ')) {
        pageText += ' ';
      }

      pageText += str;

      if (item.hasEOL && !pageText.endsWith('\n')) {
        pageText += '\n';
      }

      if (y !== null) {
        lastY = y;
      }
    }

    const trimmed = pageText.trim();
    if (trimmed) {
      fullText += (fullText ? '\n\n' : '') + trimmed;
    }
  }

  return fullText;
}

export async function getPdfjsLib(): Promise<any> {
  // 1. Cached on window/global
  if (typeof window !== 'undefined' && (window as any).pdfjsLib) {
    return (window as any).pdfjsLib;
  }

  // 2. Chrome Extension environment
  if (typeof chrome !== 'undefined' && chrome.runtime?.getURL) {
    try {
      const libUrl = chrome.runtime.getURL('libs/pdf.min.mjs');
      const pdfjs = await import(/* @vite-ignore */ libUrl);
      if (pdfjs.GlobalWorkerOptions) {
        pdfjs.GlobalWorkerOptions.workerSrc = chrome.runtime.getURL('libs/pdf.worker.min.mjs');
      }
      if (typeof window !== 'undefined') {
        (window as any).pdfjsLib = pdfjs;
      }
      return pdfjs;
    } catch (err: any) {
      console.warn('Could not load via chrome.runtime.getURL, trying relative path:', err);
      try {
        // @ts-ignore
        const pdfjs = await import(/* @vite-ignore */ '../../libs/pdf.min.mjs');
        return pdfjs;
      } catch (e2) {
        // Continue to fallback
      }
    }
  }

  // 3. Fallback for Node / Vitest testing environment
  try {
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
    return pdfjs;
  } catch (err) {
    try {
      const pdfjs = await import('pdfjs-dist');
      return pdfjs;
    } catch {
      if (typeof globalThis !== 'undefined' && (globalThis as any).pdfjsLib) {
        return (globalThis as any).pdfjsLib;
      }
      throw new Error('PDF parsing library could not be loaded.');
    }
  }
}

export async function extractTextFromPdf(data: ArrayBuffer | Uint8Array): Promise<string> {
  try {
    const pdfjsLib = await getPdfjsLib();

    if (!pdfjsLib || (!pdfjsLib.getDocument && !pdfjsLib.default?.getDocument)) {
      throw new Error('PDF parsing library could not be loaded.');
    }

    const getDocumentFn = pdfjsLib.getDocument || pdfjsLib.default.getDocument;
    const uint8Data = data instanceof Uint8Array ? data : new Uint8Array(data);
    const loadingTask = getDocumentFn({ data: uint8Data });
    const pdfDoc = await loadingTask.promise;
    return await extractTextFromPdfContent(pdfDoc);
  } catch (err: any) {
    throw new Error(`Failed to parse PDF file: ${err.message}`);
  }
}
