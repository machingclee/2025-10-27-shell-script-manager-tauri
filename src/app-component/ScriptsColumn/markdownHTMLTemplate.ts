export default function markdownHTMLTemplate(props: { scriptName: string; bodyHtml: string }) {
    const { bodyHtml, scriptName } = props;
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <base target="_blank" />
  <title>${scriptName}</title>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github.min.css" />
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; max-width: 860px; margin: 40px auto; padding: 0 24px; background: #ffffff; color: #1f2328; line-height: 1.7; }
    #toc-sidebar { position: fixed; top: 0; left: 0; bottom: 0; width: 320px; display: none; flex-direction: column; background: rgba(255,255,255,0.85); -webkit-backdrop-filter: blur(2px); backdrop-filter: blur(2px); border-right: 1px solid rgba(0,0,0,0.10); box-shadow: 0 2px 8px rgba(0,0,0,0.08); z-index: 20; overflow: hidden; }
    #toc-sidebar.toc-open { display: flex; }
    #toc-sidebar-head { display: flex; align-items: center; gap: 6px; padding: 6px 8px; flex-shrink: 0; border-bottom: 1px solid rgba(0,0,0,0.08); cursor: pointer; }
    #toc-sidebar.toc-collapsed { width: auto; bottom: auto; }
    #toc-sidebar.toc-collapsed #toc-sidebar-head { border-bottom: none; }
    #toc-sidebar-head:hover { background: rgba(150,150,150,0.40); }
    #toc-sidebar-toggle { display: flex; background: transparent; border: none; padding: 2px 4px; line-height: 1; color: rgb(50,50,50); pointer-events: none; }
    #toc-sidebar-title { font-weight: 600; opacity: 0.6; font-size: 0.75em; text-transform: uppercase; letter-spacing: 0.05em; }
    #toc-sidebar-body { position: relative; flex: 1; min-height: 0; }
    #toc-sidebar-scroll { height: 100%; overflow-y: auto; overflow-x: hidden; scrollbar-width: none; padding: 8px 12px 10px; }
    #toc-sidebar-scroll::-webkit-scrollbar { display: none; }
    #toc-sidebar-thumb { position: absolute; right: 2px; width: 6px; border-radius: 3px; background: rgba(0,0,0,0.22); }
    #toc-sidebar ul { margin: 0; padding: 0; list-style: none; }
    #toc-sidebar li.toc-active { background: rgba(37,99,235,0.10); border-radius: 4px; }
    #toc-sidebar li.toc-active > a { font-weight: 600; }
    #toc-sidebar-resize { position: absolute; top: 0; right: 0; bottom: 0; width: 6px; cursor: col-resize; }
    #toc-sidebar-resize:hover { background: rgba(0,0,0,0.12); }
    h1 { font-size: 2em; font-weight: 700; border-bottom: 1px solid #d0d7de; padding-bottom: 0.3em; margin-top: 0.67em; margin-bottom: 0.67em; }
    h2 { font-size: 1.75em; font-weight: 700; border-bottom: 1px solid #d0d7de; padding-bottom: 0.2em; margin-top: 0.75em; margin-bottom: 0.5em; }
    h3 { font-size: 1.5em; font-weight: 600; margin-top: 0.75em; margin-bottom: 0.5em; }
    h4 { font-size: 1.25em; font-weight: 600; margin-top: 0.5em; margin-bottom: 0.5em; }
    h5 { font-size: 1.1em; font-weight: 600; margin-top: 0.5em; margin-bottom: 0.5em; }
    h6 { font-size: 1em; font-weight: 600; margin-top: 0.5em; margin-bottom: 0.5em; }
    p { margin-top: 0.5em; margin-bottom: 0.5em; }
    a { color: #0969da; text-decoration: underline; }
    ul, ol { padding-left: 2em; margin-top: 0.5em; margin-bottom: 0.5em; }
    ul { list-style-type: disc; }
    ol { list-style-type: decimal; }
    li { display: list-item; padding-left: 0.5em; line-height: 1.4; }
    ul.contains-task-list { padding-left: 2em; }
    li.task-list-item { list-style: none; padding-left: 0; }
    li.task-list-item > p { display: block; margin-top: 0.5em; margin-bottom: 0.5em; }
    input[type="checkbox"] {
      appearance: none; -webkit-appearance: none;
      width: 16px; height: 16px;
      margin-top: -2px; margin-right: -1.5em; margin-left: 0;
      cursor: pointer;
      border: 2px solid #999; border-radius: 3px;
      background-color: transparent;
      position: relative; left: -2em;
      display: inline-flex; align-items: center; justify-content: center;
      vertical-align: middle; flex-shrink: 0;
    }
    li:not(.task-list-item) { margin-left: -0.5em !important; }
    img { border-radius: 4px; }
    input[type="checkbox"]:checked,
    input[type="checkbox"][checked] { background-color: rgb(59,130,246); border-color: rgb(59,130,246); background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath fill='white' d='M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: center; background-size: 11px; }
    code:not(pre code) { background: #f6f8fa; border: 1px solid #d0d7de; padding: 2px 6px; border-radius: 4px; font-size: 0.95em; white-space: pre-wrap; word-break: break-word; }
    pre { background: #f6f8fa; border: 1px solid #d0d7de; border-radius: 6px; padding: 16px; overflow: auto; margin-top: 0.5em; margin-bottom: 0.5em; }
    details { margin-top: 0.5em; margin-bottom: 0.5em; }
    summary { cursor: pointer; user-select: none; }
    details[open] > summary { margin-bottom: 0.4em; }
    pre code.hljs { background: transparent; padding: 0; font-size: 0.9em; }
    blockquote { border-left: 4px solid #d0d7de; margin-left: 0; padding-left: 1em; color: #57606a; }
    table { border-collapse: collapse; width: 100%; margin-top: 0.5em; margin-bottom: 0.5em; }
    th, td { border: 1px solid #d0d7de; padding: 8px 12px; }
    th { background: #f6f8fa; font-weight: 600; }
    img { max-width: 100%; border-radius: 4px; }
    mjx-container { display: inline-block; vertical-align: middle; }
    mjx-container[display="true"] { display: block; text-align: center; margin: 1em 0; }
    .cb-print {
      display: inline-flex; align-items: center; justify-content: center;
      width: 16px; height: 16px;
      margin-top: -2px; margin-right: -1.5em; margin-left: 0;
      border: 2px solid #999; border-radius: 3px;
      background-color: transparent;
      position: relative; left: -2em;
      vertical-align: middle; flex-shrink: 0; box-sizing: border-box;
      font-size: 11px; font-weight: 900; line-height: 1;
      color: transparent;
      -webkit-print-color-adjust: exact; print-color-adjust: exact;
    }
    .cb-print.cb-checked {
      border-color: rgb(59,130,246);
      background-color: rgb(59,130,246);
      color: white;
    }
    @media print {
      body { font-size: 12px; }
      input[type="checkbox"] {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
    }
  </style>
</head>
<body>
  <aside id="toc-sidebar">
    <div id="toc-sidebar-head" role="button" title="Hide contents" aria-pressed="true" aria-label="Hide contents">
      <span id="toc-sidebar-toggle">
        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12h-8"/><path d="M21 6H8"/><path d="M21 18h-8"/><path d="M3 6v4c0 1.1.9 2 2 2h3"/><path d="M3 10v6c0 1.1.9 2 2 2h3"/></svg>
      </span>
      <span id="toc-sidebar-title">Contents</span>
    </div>
    <div id="toc-sidebar-body">
      <div id="toc-sidebar-scroll"></div>
      <div id="toc-sidebar-thumb" hidden></div>
      <div id="toc-sidebar-resize" title="Drag to resize"></div>
    </div>
  </aside>
  <h1 style="margin-top:0">${scriptName}</h1>
  ${bodyHtml}
</body>
<script>
  document.querySelectorAll('img').forEach(function(img) {
    if (img.parentElement && img.parentElement.tagName !== 'A') {
      var a = document.createElement('a');
      a.href = img.src;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      img.parentNode.insertBefore(a, img);
      a.appendChild(img);
    }
  });

  document.querySelectorAll('input[type="checkbox"]').forEach(function(cb) {
    if (cb.checked || cb.hasAttribute('checked')) {
      cb.style.backgroundColor = 'rgb(59,130,246)';
      cb.style.borderColor = 'rgb(59,130,246)';
    }
  });

  // Print-safe checkboxes: swap <input> for <span> before printing,
  // restore after. Unicode ✓ is plain text and always prints in Chrome PDF.
  var _printBacks = [];
  window.addEventListener('beforeprint', function() {
    _printBacks = [];
    document.querySelectorAll('input[type="checkbox"]').forEach(function(cb, i) {
      var isChecked = cb.checked || cb.hasAttribute('checked');
      var span = document.createElement('span');
      span.className = 'cb-print' + (isChecked ? ' cb-checked' : '');
      span.textContent = isChecked ? '\u2713' : '';
      span.dataset.printIdx = String(i);
      _printBacks.push({ node: cb, parent: cb.parentNode, next: cb.nextSibling });
      cb.parentNode.replaceChild(span, cb);
    });
  });
  window.addEventListener('afterprint', function() {
    document.querySelectorAll('span.cb-print').forEach(function(span) {
      var idx = parseInt(span.dataset.printIdx || '0', 10);
      var orig = _printBacks[idx];
      if (orig && orig.parent) {
        if (orig.next) { orig.parent.insertBefore(orig.node, orig.next); }
        else { orig.parent.appendChild(orig.node); }
        span.parentNode && span.parentNode.removeChild(span);
      }
    });
    _printBacks = [];
  });

  // Floating contents sidebar: appears once the page is scrolled, built from the
  // document's own headings so it does not depend on an inline [TOC] block.
  (function() {
    var sidebar = document.getElementById('toc-sidebar');
    var scroll = document.getElementById('toc-sidebar-scroll');
    var thumb = document.getElementById('toc-sidebar-thumb');
    var toggle = document.getElementById('toc-sidebar-head');
    var title = document.getElementById('toc-sidebar-title');
    var body = document.getElementById('toc-sidebar-body');
    var resize = document.getElementById('toc-sidebar-resize');
    if (!sidebar || !scroll || !thumb || !toggle || !resize) return;

    var headingNodes = document.querySelectorAll('h1[id], h2[id], h3[id], h4[id], h5[id], h6[id]');
    var headings = [];
    for (var h = 0; h < headingNodes.length; h++) {
      if (headingNodes[h].closest('#toc-sidebar')) continue;
      headings.push(headingNodes[h]);
    }
    if (headings.length === 0) return;

    var minLevel = 6;
    for (var k = 0; k < headings.length; k++) {
      minLevel = Math.min(minLevel, parseInt(headings[k].tagName.charAt(1), 10));
    }
    var list = document.createElement('ul');
    for (var n = 0; n < headings.length; n++) {
      var heading = headings[n];
      var level = parseInt(heading.tagName.charAt(1), 10);
      var li = document.createElement('li');
      li.style.paddingLeft = ((level - minLevel) * 16) + 'px';
      li.style.lineHeight = '1.8';
      li.style.listStyle = 'none';
      li.style.marginLeft = '0';
      li.style.overflowWrap = 'anywhere';
      var link = document.createElement('a');
      link.href = '#' + heading.id;
      link.target = '_self';
      link.style.color = 'rgb(37,99,235)';
      link.style.textDecoration = 'none';
      link.style.fontSize = '0.9em';
      link.textContent = heading.textContent;
      li.appendChild(link);
      list.appendChild(li);
    }
    scroll.appendChild(list);

    var inline = document.querySelector('[data-inline-toc]');
    var enabled = true;
    var MIN_WIDTH = 140;
    var MAX_WIDTH = 480;

    function applyState() {
      // With an inline contents block, wait until its bottom edge has scrolled
      // past the top of the viewport. Otherwise show on any scroll.
      var show = inline
        ? inline.getBoundingClientRect().bottom < 0
        : window.scrollY > 0;
      sidebar.classList.toggle('toc-open', show);
      sidebar.classList.toggle('toc-collapsed', !enabled);
      if (body) body.hidden = !enabled;
      if (title) title.hidden = !enabled;
      toggle.title = enabled ? 'Hide contents' : 'Show contents';
      toggle.setAttribute('aria-label', toggle.title);
      toggle.setAttribute('aria-pressed', enabled ? 'true' : 'false');

      // The current section is the last heading within the lead distance of the
      // viewport top, so the highlight moves before the heading arrives.
      var ACTIVE_LEAD = 100;
      var activeId = null;
      for (var i = 0; i < headings.length; i++) {
        if (headings[i].getBoundingClientRect().top <= ACTIVE_LEAD) activeId = headings[i].id;
        else break;
      }
      var previous = scroll.querySelector('li.toc-active');
      if (previous) previous.classList.remove('toc-active');
      if (activeId) {
        var links = scroll.querySelectorAll('a[href]');
        for (var j = 0; j < links.length; j++) {
          if (links[j].getAttribute('href') === '#' + activeId) {
            var item = links[j].parentElement;
            item.classList.add('toc-active');
            if (show && enabled) item.scrollIntoView({ block: 'nearest' });
            break;
          }
        }
      }
      if (show && enabled) updateThumb();
    }

    var THUMB_MIN = 24;
    function updateThumb() {
      var scrollable = scroll.scrollHeight - scroll.clientHeight;
      if (scrollable <= 1) { thumb.hidden = true; return; }
      var height = Math.max(THUMB_MIN, (scroll.clientHeight / scroll.scrollHeight) * scroll.clientHeight);
      var top = (scroll.scrollTop / scrollable) * (scroll.clientHeight - height);
      thumb.hidden = false;
      thumb.style.height = height + 'px';
      thumb.style.top = top + 'px';
    }

    scroll.addEventListener('scroll', updateThumb, { passive: true });
    // Scroll events are not delivered reliably in every browser that opens
    // these files, so poll the geometry directly. The update is idempotent.
    setInterval(applyState, 150);
    window.addEventListener('resize', applyState);
    toggle.addEventListener('click', function() { enabled = !enabled; applyState(); });

    var drag = null;
    thumb.addEventListener('mousedown', function(e) {
      e.preventDefault();
      var scrollable = scroll.scrollHeight - scroll.clientHeight;
      var track = scroll.clientHeight - thumb.offsetHeight;
      drag = { y: e.clientY, top: scroll.scrollTop, scrollable: scrollable, track: track };
    });
    window.addEventListener('mousemove', function(e) {
      if (!drag || drag.track <= 0) return;
      scroll.scrollTop = drag.top + ((e.clientY - drag.y) / drag.track) * drag.scrollable;
    });
    window.addEventListener('mouseup', function() { drag = null; });

    var resizing = null;
    resize.addEventListener('mousedown', function(e) {
      e.preventDefault();
      resizing = { x: e.clientX, width: sidebar.offsetWidth };
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    });
    window.addEventListener('mousemove', function(e) {
      if (!resizing) return;
      var next = resizing.width + (e.clientX - resizing.x);
      next = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, Math.round(next)));
      sidebar.style.width = next + 'px';
      updateThumb();
    });
    window.addEventListener('mouseup', function() {
      if (!resizing) return;
      resizing = null;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    });

    applyState();
  })();
</script>
</html>`;
}
