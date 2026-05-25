const OVERLAY_ID = "__reader_friendly_root__";

const BLOCKED_TAGS = new Set<string>([
  "style",
  "script",
  "iframe",
  "noscript",
  "svg",
  "math",
  "canvas",
  "video",
  "audio",
  "source",
  "track",
  "embed",
  "object",
  "form",
  "input",
  "textarea",
  "button",
  "select",
  "option",
  "optgroup",
  "label",
  "fieldset",
  "legend",
  "datalist",
  "output",
  "progress",
  "meter",
  "details",
  "summary",
  "dialog",
  "menu",
  "slot",
  "template",
  "map",
  "area",
  "picture",
  "portal",
]);

// These tags are generic wrappers — we discard the container and keep only their children.
const TRANSPARENT_TAGS = new Set<string>([
  "div",
  "section",
  "article",
  "header",
  "footer",
  "aside",
  "nav",
  "main",
  "figure",
]);

function isVisible(el: Element): boolean {
  const style = window.getComputedStyle(el);
  return style.display !== "none" && style.visibility !== "hidden";
}

function cleanNode(node: Node): Node | null {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent || "";
    return text.trim() ? document.createTextNode(text) : null;
  }

  if (node.nodeType !== Node.ELEMENT_NODE) return null;

  const el = node as Element;
  const tag = el.tagName.toLowerCase();
  if (BLOCKED_TAGS.has(tag)) return null;

  if (!isVisible(el)) return null;

  // Transparent wrappers: return a fragment so children are promoted to the parent.
  if (TRANSPARENT_TAGS.has(tag)) {
    const fragment = document.createDocumentFragment();
    for (const child of Array.from(el.childNodes)) {
      const cleaned = cleanNode(child);
      if (cleaned) fragment.appendChild(cleaned);
    }
    return fragment.childNodes.length > 0 ? fragment : null;
  }

  const safeEl = document.createElement(tag);

  if (tag === "a") {
    const href = el.getAttribute("href");
    if (href) {
      safeEl.setAttribute("href", href);
      safeEl.setAttribute("target", "_blank");
      safeEl.setAttribute("rel", "noopener noreferrer");
    }
  }

  if (tag === "img") {
    const src = el.getAttribute("src");
    if (!src) return null;
    safeEl.setAttribute("src", src);
    const alt = el.getAttribute("alt") || "";
    safeEl.setAttribute("alt", alt);
    safeEl.setAttribute("loading", "lazy");
  }

  for (const child of Array.from(el.childNodes)) {
    const cleaned = cleanNode(child);
    if (cleaned) safeEl.appendChild(cleaned);
  }

  if (
    [
      "p",
      "li",
      "figcaption",
      "blockquote",
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "a",
      "span",
    ].includes(tag) &&
    !safeEl.textContent?.trim()
  ) {
    return null;
  }

  return safeEl;
}

function stripLeadingNoise(container: HTMLElement): void {
  const h1 = container.querySelector("h1");
  if (!h1) return;

  let node: Node | null = h1;
  while (node && node !== container) {
    const parent: Node | null = node.parentNode;
    if (!parent) break;
    let prev: Node | null = node.previousSibling;
    while (prev) {
      const toRemove = prev;
      prev = prev.previousSibling;
      (toRemove as ChildNode).remove();
    }
    node = parent;
  }
}

function extractReaderContent(): HTMLElement {
  const sourceRoot = document.querySelector("main, article") || document.body;
  const container = document.createElement("main");
  container.className = "rf-content rf-prose";

  for (const child of Array.from(sourceRoot.childNodes)) {
    const cleaned = cleanNode(child);
    if (cleaned) container.appendChild(cleaned);
  }

  stripLeadingNoise(container);
  return container;
}

function enableReaderMode(): void {
  if (document.getElementById(OVERLAY_ID)) return;
  const overlay = document.createElement("div");
  overlay.id = OVERLAY_ID;
  overlay.appendChild(extractReaderContent());
  document.documentElement.appendChild(overlay);
  document.documentElement.style.overflow = "hidden";
}

function disableReaderMode(): void {
  const overlay = document.getElementById(OVERLAY_ID);
  if (overlay) overlay.remove();
  document.documentElement.style.overflow = "";
}

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === "TOGGLE_READER_MODE") {
    const active = !!document.getElementById(OVERLAY_ID);
    if (active) disableReaderMode();
    else enableReaderMode();
    return;
  }

  if (message?.type === "SET_READER_MODE") {
    if (message.enabled) enableReaderMode();
    else disableReaderMode();
  }
});

chrome.runtime.sendMessage({ type: "CHECK_READER_MODE" }, (response) => {
  if (chrome.runtime.lastError) return;
  if (response?.enabled) enableReaderMode();
});
