export async function extractTextFromPdfContent(pdfDoc) {
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
export async function extractTextFromPdf(data) {
    try {
        let pdfjsLib;
        if (typeof window !== 'undefined' && window.pdfjsLib) {
            pdfjsLib = window.pdfjsLib;
        }
        else {
            try {
                pdfjsLib = await import('pdfjs-dist');
            }
            catch {
                pdfjsLib = globalThis.pdfjsLib;
            }
        }
        if (!pdfjsLib) {
            throw new Error('PDF parsing library could not be loaded.');
        }
        const loadingTask = pdfjsLib.getDocument({ data });
        const pdfDoc = await loadingTask.promise;
        return await extractTextFromPdfContent(pdfDoc);
    }
    catch (err) {
        throw new Error(`Failed to parse PDF file: ${err.message}`);
    }
}
