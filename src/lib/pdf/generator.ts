import puppeteer, { Browser, Page } from 'puppeteer';
import type { Report } from '@/lib/types';

interface PDFOptions {
  theme?: 'light' | 'dark';
  format?: 'letter' | 'a4';
}

// Browser instance cache
let browserInstance: Browser | null = null;

async function getBrowser(): Promise<Browser> {
  if (browserInstance && browserInstance.isConnected()) {
    return browserInstance;
  }

  const launchArgs = process.platform === 'linux'
    ? ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    : ['--disable-gpu'];

  browserInstance = await puppeteer.launch({
    headless: true,
    args: launchArgs,
  });

  browserInstance.on('disconnected', () => {
    browserInstance = null;
  });

  return browserInstance;
}

export async function generatePDF(
  report: Report,
  options: PDFOptions = {}
): Promise<Buffer> {
  const { theme = 'light', format = 'letter' } = options;
  
  // Dynamic import to avoid circular dependency
  const { generateReportHTML } = await import('./report-template');
  
  const html = generateReportHTML({ report, theme });
  
  const browser = await getBrowser();
  const page = await browser.newPage();
  
  try {
    // Set content
    await page.setContent(html, {
      waitUntil: 'networkidle0',
      timeout: 30000,
    });
    
    // Generate PDF
    const pdfBuffer = await page.pdf({
      format: format,
      printBackground: true,
      margin: {
        top: '0',
        right: '0',
        bottom: '0',
        left: '0',
      },
      preferCSSPageSize: true,
    });
    
    return Buffer.from(pdfBuffer);
  } finally {
    if (!page.isClosed()) {
      await page.close().catch((error) => {
        if (!(error instanceof Error) || !error.message.includes('Connection closed')) {
          throw error;
        }
      });
    }
  }
}

export async function closeBrowser(): Promise<void> {
  if (browserInstance) {
    await browserInstance.close();
    browserInstance = null;
  }
}

// Cleanup on process exit
if (typeof process !== 'undefined') {
  process.on('beforeExit', () => {
    closeBrowser().catch(console.error);
  });
}
