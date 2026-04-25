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
    code:not(pre code) { background: #f6f8fa; border: 1px solid #d0d7de; padding: 2px 6px; border-radius: 4px; font-size: 0.95em; }
    pre { background: #f6f8fa; border: 1px solid #d0d7de; border-radius: 6px; padding: 16px; overflow: auto; margin-top: 0.5em; margin-bottom: 0.5em; }
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
  <h1 style="margin-top:0">${scriptName}</h1>
  ${bodyHtml}
</body>
<script>
  document.querySelectorAll('input[type="checkbox"]').forEach(function(cb) {
    if (cb.checked || cb.hasAttribute('checked')) {
      cb.style.backgroundColor = 'rgb(59,130,246)';
      cb.style.borderColor = 'rgb(59,130,246)';
      cb.style.backgroundImage = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath fill='white' d='M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z'/%3E%3C%2Fsvg%3E\")";
      cb.style.backgroundRepeat = 'no-repeat';
      cb.style.backgroundPosition = 'center';
      cb.style.backgroundSize = '11px';
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
</script>
</html>`;
}
