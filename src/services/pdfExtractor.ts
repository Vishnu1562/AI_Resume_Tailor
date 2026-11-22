export async function extractTextFromPdfContent(pdfDoc: {
  numPages: number;
  getPage: (pageNumber: number) => Promise<{
    getTextContent: () => Promise<{ items: Array<{ str?: string }> }>;
  }>;
}): Promise<string> {
  let fullText = '';

  for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
    const page = await pdfDoc.getPage(pageNum);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item) => item.str || '')
      .join(' ')
      .trim();

    if (pageText) {
      fullText += (fullText ? '\n\n' : '') + pageText;
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
    const pdfjs = await import('pdfjs-dist');
    return pdfjs;
  } catch (err) {
    // Last resort check
    if (typeof globalThis !== 'undefined' && (globalThis as any).pdfjsLib) {
      return (globalThis as any).pdfjsLib;
    }
    throw new Error('PDF parsing library could not be loaded.');
  }
}

export async function extractTextFromPdf(data: ArrayBuffer): Promise<string> {
  try {
    const pdfjsLib = await getPdfjsLib();

    if (!pdfjsLib || (!pdfjsLib.getDocument && !pdfjsLib.default?.getDocument)) {
      throw new Error('PDF parsing library could not be loaded.');
    }

    const getDocumentFn = pdfjsLib.getDocument || pdfjsLib.default.getDocument;
    const loadingTask = getDocumentFn({ data });
    const pdfDoc = await loadingTask.promise;
    return await extractTextFromPdfContent(pdfDoc);
  } catch (err: any) {
    throw new Error(`Failed to parse PDF file: ${err.message}`);
  }
}
