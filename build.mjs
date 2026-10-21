import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const CONTENT_DIR = path.join(ROOT, 'content');
const POST_SOURCE_DIR = path.join(CONTENT_DIR, 'posts');
const TEMPLATE_DIR = path.join(ROOT, 'template');
const POSTS_OUT_DIR = path.join(ROOT, 'posts');
const INDEX_OUT = path.join(ROOT, 'index.html');

function fail(message) {
  console.error('\n[错误] ' + message + '\n');
  process.exit(1);
}

function read(file) {
  return fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeAttr(value) {
  return escapeHtml(String(value).replace(/\s+/g, ' ').trim());
}

function nl2br(value) {
  return escapeHtml(value).replace(/\n/g, '<br>');
}

function pad2(value) {
  return String(value).padStart(2, '0');
}

function accentClass(value) {
  return value === 'outline' ? 'outline' : 'accent';
}

function parseDate(value, fallbackDate) {
  const match = String(value || '').match(/(\d{4})[./-](\d{1,2})[./-](\d{1,2})/);
  let year, month, day;
  if (match) {
    year = Number(match[1]);
    month = Number(match[2]);
    day = Number(match[3]);
  } else {
    year = fallbackDate.getFullYear();
    month = fallbackDate.getMonth() + 1;
    day = fallbackDate.getDate();
  }
  const timestamp = Date.UTC(year, month - 1, day);
  const check = new Date(timestamp);
  if (Number.isNaN(timestamp) || check.getUTCFullYear() !== year || check.getUTCMonth() + 1 !== month || check.getUTCDate() !== day) {
    const y = fallbackDate.getFullYear();
    const m = fallbackDate.getMonth() + 1;
    const d = fallbackDate.getDate();
    return {
      iso: `${y}-${pad2(m)}-${pad2(d)}`,
      display: `${y}.${pad2(m)}.${pad2(d)}`,
      timestamp: Date.UTC(y, m - 1, d)
    };
  }
  return {
    iso: `${year}-${pad2(month)}-${pad2(day)}`,
    display: `${year}.${pad2(month)}.${pad2(day)}`,
    timestamp
  };
}

function todayDisplay() {
  const now = new Date();
  return `${now.getFullYear()}.${pad2(now.getMonth() + 1)}.${pad2(now.getDate())}`;
}

function parseFrontmatter(raw) {
  const text = String(raw).replace(/\r\n?/g, '\n');
  const meta = {};
  let body = text;

  if (text.startsWith('---\n')) {
    const end = text.indexOf('\n---', 4);
    if (end !== -1) {
      const frontmatter = text.slice(4, end);
      body = text.slice(end + 4).replace(/^\n+/, '');
      frontmatter.split('\n').forEach((line) => {
        if (!line.trim() || /^\s*#/.test(line)) return;
        const match = line.match(/^([A-Za-z0-9_-]+)\s*:\s*(.*)$/);
        if (!match) return;
        let value = match[2].trim();
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        meta[match[1]] = value;
      });
    }
  }

  return { meta, body: body.trim() + '\n' };
}

function stripMarkdown(value) {
  return String(value)
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[[^\]]*]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)]\([^)]*\)/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[#>*_`~\[\]()!|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function resolveImageSource(src) {
  if (/^(?:[a-z][a-z0-9+.-]*:|\/\/|\/|\.\.\/)/i.test(src)) return src;
  return '../content/posts/' + src.replace(/^\.\//, '');
}

function inlineMarkdown(raw) {
  const codeSpans = [];
  const htmlTokens = [];

  let text = String(raw).replace(/`([^`]+)`/g, (match, code) => {
    codeSpans.push(code);
    return '\u0000' + (codeSpans.length - 1) + '\u0000';
  });

  text = escapeHtml(text);

  text = text.replace(/!\[([^\]]*)]\(([^)\s]+)\)/g, (match, alt, src) => {
    htmlTokens.push('<img src="' + resolveImageSource(src) + '" alt="' + alt + '" loading="lazy" decoding="async">');
    return '\u0001' + (htmlTokens.length - 1) + '\u0001';
  });

  text = text.replace(/\[([^\]]+)]\(([^)\s]+)\)/g, (match, label, href) => {
    htmlTokens.push('<a href="' + href + '" target="_blank" rel="noopener">' + label + '</a>');
    return '\u0001' + (htmlTokens.length - 1) + '\u0001';
  });

  text = text
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/__([^_]+)__/g, '<strong>$1</strong>')
    .replace(/~~([^~]+)~~/g, '<del>$1</del>')
    .replace(/(^|[^\w])\*([^*\n]+)\*(?!\*)/g, '$1<em>$2</em>')
    .replace(/(^|[^\w])_([^_\n]+)_(?!\w)/g, '$1<em>$2</em>');

  text = text.replace(/\u0001(\d+)\u0001/g, (match, index) => htmlTokens[Number(index)] || '');
  text = text.replace(/\u0000(\d+)\u0000/g, (match, index) => '<code>' + escapeHtml(codeSpans[Number(index)] || '') + '</code>');
  return text;
}

function splitTableRow(line) {
  let value = line.trim();
  if (value.startsWith('|')) value = value.slice(1);
  if (value.endsWith('|')) value = value.slice(0, -1);
  return value.split('|').map((cell) => cell.trim());
}

function isTableSeparator(line) {
  if (!line.includes('-')) return false;
  const cells = splitTableRow(line);
  return cells.length > 0 && cells.every((cell) => /^:?-{3,}:?$/.test(cell));
}

function renderMarkdown(markdown) {
  const lines = String(markdown).replace(/\r\n?/g, '\n').split('\n');
  const html = [];
  let paragraph = [];
  let quote = [];
  let list = null;
  let inCode = false;
  let codeLang = '';
  let codeLines = [];
  let headingCount = 0;

  function flushParagraph() {
    if (!paragraph.length) return;
    html.push('<p>' + inlineMarkdown(paragraph.join(' ')) + '</p>');
    paragraph = [];
  }

  function flushList() {
    if (!list) return;
    html.push('<' + list.type + '>' + list.items.map((item) => '<li>' + inlineMarkdown(item) + '</li>').join('') + '</' + list.type + '>');
    list = null;
  }

  function flushQuote() {
    if (!quote.length) return;
    html.push('<blockquote><p>' + quote.map((line) => inlineMarkdown(line)).join('<br>') + '</p></blockquote>');
    quote = [];
  }

  function flushAll() {
    flushParagraph();
    flushList();
    flushQuote();
  }

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];

    if (inCode) {
      if (/^\s*```\s*$/.test(line)) {
        const language = codeLang ? ' class="language-' + escapeHtml(codeLang) + '"' : '';
        html.push('<pre><code' + language + '>' + escapeHtml(codeLines.join('\n')) + '</code></pre>');
        inCode = false;
        codeLang = '';
        codeLines = [];
      } else {
        codeLines.push(line);
      }
      continue;
    }

    const fence = line.match(/^\s*```(.*)$/);
    if (fence) {
      flushAll();
      inCode = true;
      codeLang = fence[1].trim();
      codeLines = [];
      continue;
    }

    if (!line.trim()) {
      flushAll();
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      flushAll();
      const level = Math.min(6, Math.max(2, heading[1].length));
      headingCount += 1;
      html.push('<h' + level + ' id="h-' + headingCount + '">' + inlineMarkdown(heading[2].trim()) + '</h' + level + '>');
      continue;
    }

    if (/^\s*([-*_])(?:\s*\1){2,}\s*$/.test(line)) {
      flushAll();
      html.push('<hr>');
      continue;
    }

    if (/^\s*>\s?/.test(line)) {
      flushParagraph();
      flushList();
      quote.push(line.replace(/^\s*>\s?/, ''));
      continue;
    }
    if (quote.length) flushQuote();

    if (line.includes('|') && i + 1 < lines.length && isTableSeparator(lines[i + 1])) {
      flushAll();
      const headers = splitTableRow(line);
      const alignments = splitTableRow(lines[i + 1]).map((cell) => {
        const left = cell.startsWith(':');
        const right = cell.endsWith(':');
        if (left && right) return 'center';
        if (right) return 'right';
        if (left) return 'left';
        return '';
      });
      i += 1;
      const rows = [];
      while (i + 1 < lines.length && lines[i + 1].trim() && lines[i + 1].includes('|')) {
        i += 1;
        rows.push(splitTableRow(lines[i]));
      }
      let table = '<table><thead><tr>';
      headers.forEach((cell, index) => {
        const align = alignments[index] ? ' style="text-align:' + alignments[index] + '"' : '';
        table += '<th' + align + '>' + inlineMarkdown(cell) + '</th>';
      });
      table += '</tr></thead><tbody>';
      rows.forEach((row) => {
        table += '<tr>';
        headers.forEach((cell, index) => {
          const align = alignments[index] ? ' style="text-align:' + alignments[index] + '"' : '';
          table += '<td' + align + '>' + inlineMarkdown(row[index] || '') + '</td>';
        });
        table += '</tr>';
      });
      table += '</tbody></table>';
      html.push(table);
      continue;
    }

    const unordered = line.match(/^\s*[-*+]\s+(.+)$/);
    const ordered = line.match(/^\s*\d+\.\s+(.+)$/);
    if (unordered || ordered) {
      flushParagraph();
      flushQuote();
      const type = ordered ? 'ol' : 'ul';
      if (!list || list.type !== type) {
        flushList();
        list = { type, items: [] };
      }
      list.items.push((ordered || unordered)[1]);
      continue;
    }
    if (list) flushList();

    paragraph.push(line.trim());
  }

  if (inCode) {
    const language = codeLang ? ' class="language-' + escapeHtml(codeLang) + '"' : '';
    html.push('<pre><code' + language + '>' + escapeHtml(codeLines.join('\n')) + '</code></pre>');
  }
  flushAll();
  return html.join('\n');
}

function estimateReadTime(markdown) {
  const plain = stripMarkdown(markdown);
  const chinese = (plain.match(/[\u3400-\u9fff]/g) || []).length;
  const latinWords = (plain.replace(/[\u3400-\u9fff]/g, ' ').match(/[A-Za-z0-9]+/g) || []).length;
  return Math.max(1, Math.round(chinese / 320 + latinWords / 200));
}

function loadPosts() {
  if (!fs.existsSync(POST_SOURCE_DIR)) {
    return [];
  }

  const files = fs.readdirSync(POST_SOURCE_DIR)
    .filter((file) => file.endsWith('.md') && !file.startsWith('.'))
    .sort();

  const posts = [];
  const usedSlugs = new Set();

  files.forEach((file) => {
    const fullPath = path.join(POST_SOURCE_DIR, file);
    const raw = read(fullPath);
    const parsed = parseFrontmatter(raw);
    const meta = parsed.meta;

    if (String(meta.draft).toLowerCase() === 'true') return;

    const stat = fs.statSync(fullPath);
    const fallbackDate = new Date(stat.mtimeMs);
    const date = parseDate(meta.date, fallbackDate);

    let title = meta.title || '';
    if (!title) {
      const h1 = parsed.body.match(/^#\s+(.+)$/m);
      title = h1 ? stripMarkdown(h1[1]) : path.basename(file, '.md');
    }

    let summary = meta.summary || '';
    if (!summary) {
      const paragraphs = parsed.body.split(/\n{2,}/).map((block) => block.trim()).filter(Boolean);
      const firstText = paragraphs.find((block) => !block.startsWith('#') && !block.startsWith('```') && !block.startsWith('>'));
      summary = firstText ? stripMarkdown(firstText) : '';
    }

    let slug = (meta.slug || path.basename(file, '.md')).trim();
    slug = slug.replace(/\s+/g, '-').replace(/[\\/:*?"<>|]/g, '').replace(/^\.+$/, '');
    if (!slug || slug.endsWith('.')) {
      fail('文章 ' + file + ' 的 slug 不合法。请改文件名，或在 frontmatter 里写 slug: your-slug');
    }
    if (usedSlugs.has(slug)) {
      fail('有两篇文章用了同一个 slug：' + slug + '。请改其中一个文件名或 slug。');
    }
    usedSlugs.add(slug);

    posts.push({
      file,
      slug,
      title: String(title).trim(),
      summary: String(summary).trim(),
      tag: String(meta.tag || '随笔').trim(),
      order: Number(meta.order) || 999,
      dateISO: date.iso,
      dateDisplay: date.display,
      timestamp: date.timestamp,
      readTime: estimateReadTime(parsed.body),
      body: parsed.body,
      html: renderMarkdown(parsed.body)
    });
  });

  posts.sort((a, b) => {
    if (b.timestamp !== a.timestamp) return b.timestamp - a.timestamp;
    if (a.order !== b.order) return a.order - b.order;
    return a.title.localeCompare(b.title, 'zh-CN');
  });

  return posts;
}

function cardFor(post, featured) {
  const href = 'posts/' + encodeURIComponent(post.slug) + '.html';
  const stamp = featured ? '\n            <span class="new-stamp" aria-hidden="true">NEW</span>' : '';
  return [
    '          <a class="post-card post-card-link' + (featured ? ' post-featured' : '') + ' reveal" href="' + href + '">',
    stamp,
    '            <div class="post-meta"><span class="post-tag">' + escapeHtml(post.tag) + '</span><span>' + post.dateDisplay + '</span><span class="dot-sep">·</span><span>' + post.readTime + ' min read</span></div>',
    '            <h3>' + escapeHtml(post.title) + '</h3>',
    '            <p>' + escapeHtml(post.summary) + '</p>',
    '            <span class="post-cta">阅读全文 <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg></span>',
    '          </a>'
  ].filter(Boolean).join('\n');
}

function pagerFor(post, direction) {
  if (!post) {
    const emptyLabel = direction === 'prev' ? '已经是第一篇了' : '已经是最后一篇了';
    return '<span class="pager-empty" aria-hidden="true"><span>' + emptyLabel + '</span></span>';
  }
  const isPrev = direction === 'prev';
  const label = isPrev ? '← 上一篇' : '下一篇 →';
  const href = encodeURIComponent(post.slug) + '.html';
  return '<a class="pager-link ' + (isPrev ? 'prev' : 'next') + '" href="' + href + '"><span>' + label + '</span><b>' + escapeHtml(post.title) + '</b></a>';
}

function fillTemplate(template, values, label) {
  const result = template.replace(/\{\{([A-Z0-9_]+)\}\}/g, (match, key) => {
    if (!Object.prototype.hasOwnProperty.call(values, key)) {
      fail(label + ' 缺少数值：{{' + key + '}}。请检查 settings.json 或模板。');
    }
    return values[key];
  });
  return result;
}

function main() {
  const settingsPath = path.join(CONTENT_DIR, 'settings.json');
  if (!fs.existsSync(settingsPath)) fail('找不到 content/settings.json');
  let settings;
  try {
    settings = JSON.parse(read(settingsPath));
  } catch (error) {
    fail('content/settings.json 不是合法 JSON：' + error.message);
  }

  const site = settings.site || {};
  const hero = settings.hero || {};
  const sections = settings.sections || {};
  const quotes = Array.isArray(settings.quotes) ? settings.quotes : [];
  const footer = settings.footer || {};

  if (!site.title || !site.description || !site.name) fail('settings.json 里的 site.name / site.title / site.description 不能为空。');
  if (!hero.titleMain || !hero.intro) fail('settings.json 里的 hero.titleMain / hero.intro 不能为空。');
  if (!quotes.length) fail('settings.json 里的 quotes 至少需要一条。');
  quotes.forEach((quote, index) => {
    if (!quote || !quote.text) fail('第 ' + (index + 1) + ' 条 quote 缺少 text。');
    if (!quote.source) quote.source = '';
  });

  const posts = loadPosts();

  if (!fs.existsSync(path.join(TEMPLATE_DIR, 'index.template.html'))) fail('找不到 template/index.template.html');
  if (!fs.existsSync(path.join(TEMPLATE_DIR, 'post.template.html'))) fail('找不到 template/post.template.html');

  const indexTemplate = read(path.join(TEMPLATE_DIR, 'index.template.html'));
  const postTemplate = read(path.join(TEMPLATE_DIR, 'post.template.html'));

  const recentCards = posts.length
    ? posts.map((post, index) => cardFor(post, index === 0)).join('\n\n')
    : '<div class="posts-empty">还没有文章。把 Markdown 放进 <code>content/posts/</code>，再双击「更新网站.bat」。</div>';

  const updated = posts.length ? posts[0].dateDisplay : todayDisplay();
  const quoteCount = pad2(quotes.length);
  const firstQuote = quotes[0];
  const quotesJson = JSON.stringify(quotes)
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');

  const tagline = (Array.isArray(hero.tagline) ? hero.tagline : [])
    .map((item) => '<span>' + escapeHtml(item) + '</span>')
    .join('<i aria-hidden="true">✦</i>');
  const heroTags = (Array.isArray(hero.tags) ? hero.tags : [])
    .map((item) => '          <span class="tag">' + escapeHtml(item) + '</span>')
    .join('\n');

  const indexValues = {
    SITE_NAME: escapeHtml(site.name),
    SITE_TITLE: escapeAttr(site.title),
    SITE_DESCRIPTION: escapeAttr(site.description),

    HERO_EYEBROW_LEFT: escapeHtml(hero.eyebrowLeft || 'PERSONAL BLOG'),
    HERO_EYEBROW_RIGHT: escapeHtml(hero.eyebrowRight || ''),
    HERO_TITLE_MAIN: escapeHtml(hero.titleMain),
    HERO_TITLE_ACCENT: escapeHtml(hero.titleAccent || ''),
    HERO_TAGLINE: tagline,
    HERO_INTRO: nl2br(hero.intro || ''),
    HERO_NOTE: nl2br(hero.note || ''),
    HERO_TAGS: heroTags,

    ABOUT_KICKER: escapeHtml(sections.about?.kicker || ''),
    ABOUT_META: escapeHtml(sections.about?.meta || ''),
    ABOUT_TITLE: escapeHtml(sections.about?.title || ''),
    ABOUT_ACCENT: escapeHtml(sections.about?.accent || ''),
    ABOUT_ACCENT_CLASS: accentClass(sections.about?.accentClass),
    ABOUT_DESC: nl2br(sections.about?.description || ''),

    LIKES_KICKER: escapeHtml(sections.likes?.kicker || ''),
    LIKES_META: escapeHtml(sections.likes?.meta || ''),
    LIKES_TITLE: escapeHtml(sections.likes?.title || ''),
    LIKES_ACCENT: escapeHtml(sections.likes?.accent || ''),
    LIKES_ACCENT_CLASS: accentClass(sections.likes?.accentClass),
    LIKES_DESC: nl2br(sections.likes?.description || ''),

    RECENT_KICKER: escapeHtml(sections.recent?.kicker || ''),
    RECENT_META: escapeHtml(sections.recent?.meta || ''),
    RECENT_TITLE: escapeHtml(sections.recent?.title || ''),
    RECENT_ACCENT: escapeHtml(sections.recent?.accent || ''),
    RECENT_ACCENT_CLASS: accentClass(sections.recent?.accentClass),
    RECENT_DESC: nl2br(sections.recent?.description || ''),
    RECENT_CARDS: recentCards,
    NOW_UPDATED: escapeHtml(updated),

    QUOTES_KICKER: escapeHtml(sections.quotes?.kicker || '04 / 薯言薯语'),
    FIRST_QUOTE_TEXT: escapeHtml(firstQuote.text),
    FIRST_QUOTE_SOURCE: escapeHtml(firstQuote.source),
    QUOTE_COUNT: quoteCount,
    QUOTES_JSON: quotesJson,

    TALK_KICKER: escapeHtml(sections.talk?.kicker || ''),
    TALK_META: escapeHtml(sections.talk?.meta || ''),
    TALK_TITLE: escapeHtml(sections.talk?.title || ''),
    TALK_ACCENT: escapeHtml(sections.talk?.accent || ''),
    TALK_ACCENT_CLASS: accentClass(sections.talk?.accentClass),
    TALK_DESC: nl2br(sections.talk?.description || ''),

    FOOTER_TAGLINE: nl2br(footer.tagline || ''),
    FOOTER_NOTE: nl2br(footer.note || ''),
    FOOTER_WARNING: escapeHtml(footer.warning || ''),
    FOOTER_QUOTE: escapeHtml(footer.quote || ''),
    YEAR: String(new Date().getFullYear())
  };

  const indexHtml = fillTemplate(indexTemplate, indexValues, 'index.template.html');
  fs.writeFileSync(INDEX_OUT, indexHtml, 'utf8');

  fs.rmSync(POSTS_OUT_DIR, { recursive: true, force: true });
  fs.mkdirSync(POSTS_OUT_DIR, { recursive: true });

  posts.forEach((post, index) => {
    const values = {
      SITE_NAME: escapeHtml(site.name),
      YEAR: String(new Date().getFullYear()),
      POST_TITLE: escapeHtml(post.title),
      POST_SUMMARY: escapeAttr(post.summary),
      POST_SUMMARY_TEXT: escapeHtml(post.summary),
      POST_TAG: escapeHtml(post.tag),
      POST_DATE: escapeHtml(post.dateDisplay),
      POST_READ: String(post.readTime),
      POST_CONTENT: post.html,
      POST_FILE_URL: encodeURIComponent(post.file),
      POST_FILE_NAME: escapeHtml(post.file),
      POST_PREV: pagerFor(posts[index - 1], 'prev'),
      POST_NEXT: pagerFor(posts[index + 1], 'next')
    };
    const page = fillTemplate(postTemplate, values, 'post.template.html');
    fs.writeFileSync(path.join(POSTS_OUT_DIR, post.slug + '.html'), page, 'utf8');
  });

  console.log('');
  console.log('  大薯ki 静态博客 · 已更新');
  console.log('  --------------------------------');
  console.log('  主页：index.html');
  console.log('  文章：' + posts.length + ' 篇');
  console.log('  最近更新：' + updated);
  posts.forEach((post) => console.log('    · ' + post.title + '  →  posts/' + post.slug + '.html'));
  console.log('');
  console.log('  直接双击 index.html 就可以看。');
  console.log('');
}

main();
