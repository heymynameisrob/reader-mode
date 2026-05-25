import { describe, it, expect, vi, beforeEach } from 'vitest';
import { resetChromeMocks, mockChrome } from './setup';

describe('content', () => {
  let content: typeof import('../src/content');

  beforeEach(async () => {
    resetChromeMocks();
    vi.resetModules();
    document.documentElement.innerHTML = '<body></body>';
    content = await import('../src/content');
  });

  describe('isVisible', () => {
    it('returns true for visible elements', () => {
      const el = document.createElement('div');
      document.body.appendChild(el);
      expect(content.isVisible(el)).toBe(true);
    });

    it('returns false for display:none', () => {
      const el = document.createElement('div');
      el.style.display = 'none';
      document.body.appendChild(el);
      expect(content.isVisible(el)).toBe(false);
    });

    it('returns false for visibility:hidden', () => {
      const el = document.createElement('div');
      el.style.visibility = 'hidden';
      document.body.appendChild(el);
      expect(content.isVisible(el)).toBe(false);
    });
  });

  describe('cleanNode', () => {
    it('returns null for blocked tags', () => {
      const script = document.createElement('script');
      script.textContent = 'alert(1)';
      expect(content.cleanNode(script)).toBeNull();
    });

    it('returns null for invisible elements', () => {
      const div = document.createElement('div');
      div.style.display = 'none';
      document.body.appendChild(div);
      expect(content.cleanNode(div)).toBeNull();
    });

    it('returns text node for text', () => {
      const text = document.createTextNode('hello world');
      const result = content.cleanNode(text);
      expect(result?.nodeType).toBe(Node.TEXT_NODE);
      expect(result?.textContent).toBe('hello world');
    });

    it('returns null for whitespace-only text', () => {
      const text = document.createTextNode('   \n\t   ');
      expect(content.cleanNode(text)).toBeNull();
    });

    it('unwraps transparent tags', () => {
      const div = document.createElement('div');
      div.appendChild(document.createTextNode('text content'));
      const result = content.cleanNode(div);
      expect(result).toBeInstanceOf(DocumentFragment);
      expect(result?.textContent).toBe('text content');
    });

    it('copies anchor attributes safely', () => {
      const a = document.createElement('a');
      a.setAttribute('href', 'https://example.com');
      a.textContent = 'Link';
      const result = content.cleanNode(a) as HTMLAnchorElement;
      expect(result.tagName.toLowerCase()).toBe('a');
      expect(result.getAttribute('href')).toBe('https://example.com');
      expect(result.getAttribute('target')).toBe('_blank');
      expect(result.getAttribute('rel')).toBe('noopener noreferrer');
    });

    it('copies image attributes', () => {
      const img = document.createElement('img');
      img.setAttribute('src', 'https://example.com/image.png');
      img.setAttribute('alt', 'Description');
      const result = content.cleanNode(img) as HTMLImageElement;
      expect(result.getAttribute('src')).toBe('https://example.com/image.png');
      expect(result.getAttribute('alt')).toBe('Description');
      expect(result.getAttribute('loading')).toBe('lazy');
    });

    it('returns null for image without src', () => {
      const img = document.createElement('img');
      expect(content.cleanNode(img)).toBeNull();
    });

    it('returns null for empty paragraph', () => {
      const p = document.createElement('p');
      expect(content.cleanNode(p)).toBeNull();
    });

    it('returns null for empty anchor', () => {
      const a = document.createElement('a');
      expect(content.cleanNode(a)).toBeNull();
    });

    it('keeps paragraph with text', () => {
      const p = document.createElement('p');
      p.textContent = 'Hello';
      const result = content.cleanNode(p);
      expect(result?.textContent).toBe('Hello');
    });

    it('preserves children of non-transparent elements', () => {
      const section = document.createElement('section');
      const p = document.createElement('p');
      p.textContent = 'Inside section';
      section.appendChild(p);
      const result = content.cleanNode(section);
      expect(result).toBeInstanceOf(DocumentFragment);
      expect(result?.textContent).toBe('Inside section');
    });
  });

  describe('extractReaderContent', () => {
    it('strips scripts and styles', () => {
      document.documentElement.innerHTML = `
        <body>
          <article>
            <h1>Title</h1>
            <script>evil</script>
            <style>css</style>
            <p>Safe</p>
          </article>
        </body>
      `;
      const result = content.extractReaderContent();
      expect(result.querySelector('script')).toBeNull();
      expect(result.querySelector('style')).toBeNull();
      expect(result.textContent).toContain('Safe');
      expect(result.textContent).toContain('Title');
    });

    it('unwraps div wrappers', () => {
      document.documentElement.innerHTML = `
        <body>
          <main>
            <div><p>Nested</p></div>
          </main>
        </body>
      `;
      const result = content.extractReaderContent();
      expect(result.querySelector('div')).toBeNull();
      expect(result.textContent).toContain('Nested');
    });

    it('falls back to body when no main or article', () => {
      document.documentElement.innerHTML = `
        <body>
          <p>Body content</p>
        </body>
      `;
      const result = content.extractReaderContent();
      expect(result.textContent).toContain('Body content');
    });
  });

  describe('enableReaderMode / disableReaderMode', () => {
    beforeEach(() => {
      document.documentElement.innerHTML = `
        <body>
          <main>
            <h1>Title</h1>
            <p>Content</p>
          </main>
        </body>
      `;
    });

    it('creates overlay with extracted content', () => {
      content.enableReaderMode();
      const overlay = document.getElementById('__reader_friendly_root__');
      expect(overlay).not.toBeNull();
      expect(overlay?.querySelector('.rf-content')).not.toBeNull();
      expect(document.documentElement.style.overflow).toBe('hidden');
    });

    it('does not create duplicate overlays', () => {
      content.enableReaderMode();
      content.enableReaderMode();
      expect(document.querySelectorAll('#__reader_friendly_root__').length).toBe(1);
    });

    it('removes overlay and restores overflow', () => {
      content.enableReaderMode();
      content.disableReaderMode();
      expect(document.getElementById('__reader_friendly_root__')).toBeNull();
      expect(document.documentElement.style.overflow).toBe('');
    });
  });

  describe('message handlers', () => {
    beforeEach(() => {
      document.documentElement.innerHTML = `
        <body>
          <main>
            <h1>Title</h1>
            <p>Content</p>
          </main>
        </body>
      `;
    });

    it('enables reader mode on SET_READER_MODE enabled', async () => {
      await mockChrome.runtime.onMessage.trigger({ type: 'SET_READER_MODE', enabled: true });
      expect(document.getElementById('__reader_friendly_root__')).not.toBeNull();
    });

    it('disables reader mode on SET_READER_MODE disabled', async () => {
      content.enableReaderMode();
      await mockChrome.runtime.onMessage.trigger({ type: 'SET_READER_MODE', enabled: false });
      expect(document.getElementById('__reader_friendly_root__')).toBeNull();
    });

    it('toggles reader mode on TOGGLE_READER_MODE', async () => {
      await mockChrome.runtime.onMessage.trigger({ type: 'TOGGLE_READER_MODE' });
      expect(document.getElementById('__reader_friendly_root__')).not.toBeNull();

      await mockChrome.runtime.onMessage.trigger({ type: 'TOGGLE_READER_MODE' });
      expect(document.getElementById('__reader_friendly_root__')).toBeNull();
    });

    it('ignores unknown message types', async () => {
      await mockChrome.runtime.onMessage.trigger({ type: 'UNKNOWN' });
      expect(document.getElementById('__reader_friendly_root__')).toBeNull();
    });
  });
});
