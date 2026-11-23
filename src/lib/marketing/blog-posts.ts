import 'server-only';

import fs from 'node:fs';
import path from 'node:path';

export type BlogPost = {
  slug: string;
  date: string;
  category: string;
  title: string;
  summary: string;
  readingTime: string;
  audience: string;
  lead: string;
  takeaway: string;
  sections: Array<{
    title: string;
    paragraphs: string[];
  }>;
  engagement: {
    prompt: string;
    primaryLabel: string;
    primaryHref: string;
    secondaryLabel: string;
    secondaryHref: string;
  };
};

type CuratedPostConfig = {
  fileName: string;
  date: string;
  category: string;
  audience: string;
  summary: string;
  engagement: BlogPost['engagement'];
};

const curatedPostConfigs: CuratedPostConfig[] = [
  {
    fileName: '01-what-carbon-accounting-actually-looks-like-inside-a-small-operations-team.md',
    date: 'April 1, 2026',
    category: 'Carbon Accounting',
    audience: 'Startup founders, operations managers, and analysts building their first reporting rhythm',
    summary:
      'A grounded look at what carbon accounting actually feels like inside a small team once source files, ownership gaps, and monthly review pressure show up.',
    engagement: {
      prompt:
        'If this sounds uncomfortably familiar, the next useful step is usually tightening intake, review, and ownership before adding more reporting complexity.',
      primaryLabel: 'Contact Eco-Loom',
      primaryHref: '/contact',
      secondaryLabel: 'Explore Eco-Loom',
      secondaryHref: '/',
    },
  },
  {
    fileName: '05-how-to-build-a-monthly-emissions-tracking-workflow-without-losing-your-mind.md',
    date: 'March 29, 2026',
    category: 'Workflow',
    audience: 'Operations teams trying to make monthly emissions tracking less chaotic',
    summary:
      'How to build a monthly emissions close that is clear enough to run, flexible enough to survive late data, and calm enough to repeat.',
    engagement: {
      prompt:
        'A monthly workflow gets easier to sustain once timing, intake, and exception handling stop being negotiated every cycle.',
      primaryLabel: 'Explore Eco-Loom',
      primaryHref: '/',
      secondaryLabel: 'Contact Eco-Loom',
      secondaryHref: '/contact',
    },
  },
  {
    fileName: '06-why-your-emissions-data-breaks-before-the-report-does.md',
    date: 'March 26, 2026',
    category: 'Data Quality',
    audience: 'Reporting owners who keep finding the same data problems too late',
    summary:
      'Why weak emissions reporting usually starts long before the final report, and what that means for source ownership, evidence quality, and review discipline.',
    engagement: {
      prompt:
        'Most reporting pain shows up late, but the fix usually lives earlier in the process where files, context, and ownership first enter the workflow.',
      primaryLabel: 'Contact Eco-Loom',
      primaryHref: '/contact',
      secondaryLabel: 'Explore Eco-Loom',
      secondaryHref: '/',
    },
  },
  {
    fileName: '09-how-to-review-carbon-data-before-it-becomes-a-board-slide.md',
    date: 'March 23, 2026',
    category: 'Review',
    audience: 'Finance, sustainability, and operations teams preparing numbers for leadership review',
    summary:
      'A practical guide to reviewing carbon data before it turns into a polished slide no one is fully comfortable defending.',
    engagement: {
      prompt:
        'A calmer review cycle usually starts with traceable records, clearer approvals, and less last-minute interpretation.',
      primaryLabel: 'Explore Eco-Loom',
      primaryHref: '/',
      secondaryLabel: 'Contact Eco-Loom',
      secondaryHref: '/contact',
    },
  },
  {
    fileName: '11-csrd-issb-and-gri-how-to-think-about-frameworks-without-panicking.md',
    date: 'March 20, 2026',
    category: 'Frameworks',
    audience: 'Non-expert readers trying to understand reporting frameworks without drowning in acronyms',
    summary:
      'A clear way to think about CSRD, ISSB, and GRI without pretending they are interchangeable or treating framework selection as the whole job.',
    engagement: {
      prompt:
        'Framework confusion usually eases once the reporting purpose, data maturity, and real disclosure pressure are made explicit.',
      primaryLabel: 'Contact Eco-Loom',
      primaryHref: '/contact',
      secondaryLabel: 'Explore Eco-Loom',
      secondaryHref: '/',
    },
  },
  {
    fileName: '14-building-an-evidence-trail-for-esg-reporting-that-you-can-defend-later.md',
    date: 'March 17, 2026',
    category: 'Governance',
    audience: 'Teams that need a reporting trail they can explain months after the number was entered',
    summary:
      'What a defensible ESG evidence trail actually looks like, and why file storage alone is never enough.',
    engagement: {
      prompt:
        'Evidence becomes much easier to defend when context, review, and change history are captured alongside the source itself.',
      primaryLabel: 'Explore Eco-Loom',
      primaryHref: '/',
      secondaryLabel: 'Contact Eco-Loom',
      secondaryHref: '/contact',
    },
  },
  {
    fileName: '16-how-multi-site-companies-should-handle-facility-level-esg-data.md',
    date: 'March 14, 2026',
    category: 'Multi-Site Operations',
    audience: 'Operators and analysts dealing with facility-level ESG data across several sites',
    summary:
      'How multi-site companies can handle facility-level ESG data without flattening local reality into one portfolio number too early.',
    engagement: {
      prompt:
        'Multi-site reporting gets stronger once local ownership and central standards are both visible in the same operating model.',
      primaryLabel: 'Contact Eco-Loom',
      primaryHref: '/contact',
      secondaryLabel: 'Explore Eco-Loom',
      secondaryHref: '/',
    },
  },
  {
    fileName: '22-why-carbon-budgets-sound-good-and-often-fail-in-practice.md',
    date: 'March 11, 2026',
    category: 'Planning',
    audience: 'Leads trying to translate emissions goals into monthly operating signals',
    summary:
      'Why carbon budgets are appealing, where they tend to fail, and what makes them usable in day-to-day decision-making.',
    engagement: {
      prompt:
        'Carbon budgets only become useful when the data is stable enough and the operating levers are clear enough to change behavior in time.',
      primaryLabel: 'Explore Eco-Loom',
      primaryHref: '/',
      secondaryLabel: 'Contact Eco-Loom',
      secondaryHref: '/contact',
    },
  },
  {
    fileName: '26-what-to-measure-on-a-sustainability-dashboard-and-what-to-ignore.md',
    date: 'March 8, 2026',
    category: 'Dashboards',
    audience: 'Teams deciding which sustainability metrics deserve space on the main operating view',
    summary:
      'A practical way to decide what belongs on a sustainability dashboard, what should stay in deeper analysis, and what should be ignored.',
    engagement: {
      prompt:
        'A useful dashboard usually answers a small number of operating questions well instead of trying to make every metric feel important.',
      primaryLabel: 'Contact Eco-Loom',
      primaryHref: '/contact',
      secondaryLabel: 'Explore Eco-Loom',
      secondaryHref: '/',
    },
  },
  {
    fileName: '30-when-to-add-tools-when-to-stay-manual-and-how-to-know-the-difference.md',
    date: 'March 4, 2026',
    category: 'Systems',
    audience: 'Founders and operators trying to decide when a workflow is ready for software',
    summary:
      'How to tell whether your sustainability process is ready for a tool, when manual work is still useful, and why timing matters more than teams admit.',
    engagement: {
      prompt:
        'The best time to add a tool is usually when the process is stable enough to benefit from structure, not when the workflow is still being invented every week.',
      primaryLabel: 'Explore Eco-Loom',
      primaryHref: '/',
      secondaryLabel: 'Contact Eco-Loom',
      secondaryHref: '/contact',
    },
  },
];

function getPostsDirectory() {
  return path.join(process.cwd(), 'docs', 'blog-seo-pack', 'posts');
}

function slugFromFileName(fileName: string) {
  return fileName.replace(/^\d+-/, '').replace(/\.md$/, '');
}

function estimateReadingTime(text: string) {
  const words = text.split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(4, Math.round(words / 200));
  return `${minutes} min read`;
}

function isPostMetadataLine(line: string) {
  return line.includes('|') && /\|\s*\d+\s+min read$/i.test(line);
}

function isPostMetadataField(line: string) {
  return /^(?:\*\*Topic:\*\*|\*\*Primary Keyword:\*\*|\*\*Publish Date:\*\*|\*\*Status:\*\*)/.test(
    line
  );
}

function parseMarkdownPost(content: string) {
  const lines = content.split(/\r?\n/);
  const title = lines[0].replace(/^#\s+/, '').trim();
  const intro: string[] = [];
  const sections: Array<{ title: string; paragraphs: string[] }> = [];

  let currentSection: { title: string; paragraphs: string[] } | null = null;
  let paragraphBuffer: string[] = [];
  let takeaway = '';

  const flushParagraph = () => {
    const text = paragraphBuffer.join(' ').trim();
    if (!text) {
      paragraphBuffer = [];
      return;
    }

    if (currentSection) {
      currentSection.paragraphs.push(text);
    } else {
      intro.push(text);
    }

    paragraphBuffer = [];
  };

  for (const rawLine of lines.slice(1)) {
    const line = rawLine.trim();

    if (!line) {
      flushParagraph();
      continue;
    }

    if (isPostMetadataLine(line)) {
      continue;
    }

    if (isPostMetadataField(line)) {
      continue;
    }

    if (line.startsWith('## ')) {
      flushParagraph();
      if (currentSection) {
        sections.push(currentSection);
      }
      currentSection = {
        title: line.replace(/^##\s+/, '').trim(),
        paragraphs: [],
      };
      continue;
    }

    if (line.startsWith('**Key Takeaway:**')) {
      flushParagraph();
      takeaway = line.replace(/^\*\*Key Takeaway:\*\*\s*/, '').trim();
      continue;
    }

    if (line.startsWith('- ')) {
      flushParagraph();
      const bulletText = line.replace(/^- /, '').trim();
      if (currentSection) {
        currentSection.paragraphs.push(bulletText);
      } else {
        intro.push(bulletText);
      }
      continue;
    }

    paragraphBuffer.push(line);
  }

  flushParagraph();
  if (currentSection) {
    sections.push(currentSection);
  }

  return {
    title,
    lead: intro.join(' ').trim(),
    sections,
    takeaway,
  };
}

function readPostMetadata(markdown: string) {
  const readField = (name: string) =>
    markdown.match(new RegExp(`^\\*\\*${name}:\\*\\*\\s*(.+)$`, 'm'))?.[1]?.trim();

  return {
    category: readField('Topic') ?? 'ESG',
    date: readField('Publish Date') ?? 'April 1, 2026',
  };
}

function createSummary(lead: string) {
  const normalized = lead.replace(/\s+/g, ' ').trim();
  if (normalized.length <= 180) return normalized;

  return `${normalized.slice(0, 177).replace(/\s+\S*$/, '')}…`;
}

function buildBlogPosts(): BlogPost[] {
  const postsDirectory = getPostsDirectory();
  const curatedPosts = new Map(curatedPostConfigs.map((config) => [config.fileName, config]));
  const fileNames = fs
    .readdirSync(postsDirectory)
    .filter((fileName) => fileName.endsWith('.md'))
    .sort((left, right) => left.localeCompare(right));

  return fileNames.map((fileName) => {
    const markdown = fs.readFileSync(path.join(postsDirectory, fileName), 'utf8');
    const parsed = parseMarkdownPost(markdown);
    const metadata = readPostMetadata(markdown);
    const curated = curatedPosts.get(fileName);

    return {
      slug: slugFromFileName(fileName),
      date: metadata.date,
      category: metadata.category,
      title: parsed.title,
      summary: curated?.summary ?? createSummary(parsed.lead),
      readingTime: estimateReadingTime(markdown.replace(/[#*]/g, ' ')),
      audience:
        curated?.audience ??
        `For sustainability, finance, and operations teams working on ${metadata.category.toLowerCase()}.`,
      lead: parsed.lead,
      takeaway: parsed.takeaway,
      sections: parsed.sections,
      engagement:
        curated?.engagement ?? {
          prompt:
            'Build a clearer, more reliable sustainability reporting workflow with Eco-Loom.',
          primaryLabel: 'Explore Eco-Loom',
          primaryHref: '/',
          secondaryLabel: 'Contact Eco-Loom',
          secondaryHref: '/contact',
        },
    };
  });
}

export const blogPosts: BlogPost[] = buildBlogPosts();

export function getBlogPost(slug: string) {
  return blogPosts.find((post) => post.slug === slug) || null;
}
