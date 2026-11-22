import { describe, it, expect, vi } from 'vitest';
import { extractTextFromPdfContent } from '../src/services/pdfExtractor';

describe('PDF Text Extractor (HF-001, NF-005)', () => {
  it('extracts and concatenates text content across pages', async () => {
    const mockPdfDoc = {
      numPages: 2,
      getPage: vi.fn((pageNum: number) => {
        if (pageNum === 1) {
          return Promise.resolve({
            getTextContent: () =>
              Promise.resolve({
                items: [{ str: 'Alex Morgan' }, { str: 'Software Engineer' }],
              }),
          });
        }
        return Promise.resolve({
          getTextContent: () =>
            Promise.resolve({
              items: [{ str: 'Experience at TechCorp' }, { str: '2022-Present' }],
            }),
        });
      }),
    };

    const text = await extractTextFromPdfContent(mockPdfDoc as any);
    expect(text).toContain('Alex Morgan Software Engineer');
    expect(text).toContain('Experience at TechCorp 2022-Present');
  });

  it('handles empty pages gracefully', async () => {
    const mockEmptyPdf = {
      numPages: 1,
      getPage: () =>
        Promise.resolve({
          getTextContent: () => Promise.resolve({ items: [] }),
        }),
    };

    const text = await extractTextFromPdfContent(mockEmptyPdf as any);
    expect(text).toBe('');
  });
});
