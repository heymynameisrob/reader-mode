(() => {
  const OVERLAY_ID = "__reader_friendly_root__";

  const BLOCKED_TAGS = new Set(["style", "script", "iframe"]);

  const ALLOWED_TAGS = new Set([
    "article",
    "section",
    "nav",
    "main",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "p",
    "ul",
    "ol",
    "li",
    "blockquote",
    "pre",
    "code",
    "em",
    "strong",
    "a",
    "img",
    "figure",
    "figcaption",
    "table",
    "thead",
    "tbody",
    "tr",
    "th",
    "td",
    "hr",
    "br"
  ]);

  function isVisible(el) {
    const style = window.getComputedStyle(el);
    return style.display !== "none" && style.visibility !== "hidden";
  }

  function cleanNode(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent || "";
      return text.trim() ? document.createTextNode(text) : null;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) return null;

    const el = node;
    const tag = el.tagName.toLowerCase();
    if (BLOCKED_TAGS.has(tag)) return null;

    if (!ALLOWED_TAGS.has(tag)) {
      const fragment = document.createDocumentFragment();
      for (const child of el.childNodes) {
        const cleaned = cleanNode(child);
        if (cleaned) fragment.appendChild(cleaned);
      }
      return fragment.childNodes.length ? fragment : null;
    }

    if (!isVisible(el)) return null;

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

    for (const child of el.childNodes) {
      const cleaned = cleanNode(child);
      if (cleaned) safeEl.appendChild(cleaned);
    }

    if (
      ["p", "li", "figcaption", "blockquote", "h1", "h2", "h3", "h4", "h5", "h6", "a"].includes(tag) &&
      !safeEl.textContent.trim()
    ) {
      return null;
    }

    return safeEl;
  }

  function stripLeadingNoise(container) {
    const h1 = container.querySelector("h1");
    if (!h1) return;

    let node = h1;
    while (node && node !== container) {
      const parent = node.parentNode;
      let prev = node.previousSibling;
      while (prev) {
        const toRemove = prev;
        prev = prev.previousSibling;
        toRemove.remove();
      }
      node = parent;
    }
  }

  function extractReaderContent() {
    const sourceRoot = document.querySelector("main, article") || document.body;
    const container = document.createElement("main");
    container.className = "rf-content rf-prose";

    for (const child of sourceRoot.childNodes) {
      const cleaned = cleanNode(child);
      if (cleaned) container.appendChild(cleaned);
    }

    stripLeadingNoise(container);
    return container;
  }

  function enableReaderMode() {
    if (document.getElementById(OVERLAY_ID)) return;
    const overlay = document.createElement("div");
    overlay.id = OVERLAY_ID;
    overlay.appendChild(extractReaderContent());
    document.documentElement.appendChild(overlay);
    document.documentElement.style.overflow = "hidden";
  }

  function disableReaderMode() {
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
})();
