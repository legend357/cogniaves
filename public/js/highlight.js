function escHtml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function syntaxHighlight(code, lang) {
  let escaped = escHtml(code);

  const comments = [];
  const strings = [];

  escaped = escaped.replace(/(\/\/[^\n]*|#[^\n]*|\/\*[\s\S]*?\*\/)/g, (m) => {
    comments.push(m); return `__COMMENT_${comments.length - 1}__`;
  });

  escaped = escaped.replace(/(`[^`]*`|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/g, (m) => {
    strings.push(m); return `__STRING_${strings.length - 1}__`;
  });

  const keywords = {
    python: /\b(def|class|import|from|return|if|elif|else|for|while|in|not|and|or|True|False|None|with|as|try|except|finally|raise|pass|break|continue|lambda|yield|global|nonlocal|del|assert|is|print|range|len|type|str|int|float|list|dict|tuple|set|bool)\b/g,
    javascript: /\b(const|let|var|function|return|if|else|for|while|do|class|new|this|super|import|export|from|default|async|await|try|catch|finally|throw|typeof|instanceof|in|of|true|false|null|undefined|void|delete|switch|case|break|continue|yield|get|set|static)\b/g,
    typescript: /\b(const|let|var|function|return|if|else|for|while|class|new|this|interface|type|enum|implements|extends|import|export|from|default|async|await|try|catch|finally|throw|typeof|instanceof|true|false|null|undefined|string|number|boolean|any|void|never|object|readonly|public|private|protected|abstract|declare)\b/g,
    java: /\b(public|private|protected|class|interface|extends|implements|new|return|if|else|for|while|do|try|catch|finally|throw|throws|static|final|abstract|void|int|long|double|float|boolean|char|byte|short|String|this|super|import|package|null|true|false|instanceof|switch|case|break|continue)\b/g,
    go: /\b(func|return|if|else|for|range|switch|case|break|continue|var|const|type|struct|interface|package|import|go|defer|select|chan|map|make|new|len|cap|append|copy|delete|panic|recover|nil|true|false|int|int8|int16|int32|int64|uint|string|bool|byte|rune|float32|float64|error)\b/g,
    rust: /\b(fn|let|mut|const|use|pub|mod|struct|enum|impl|trait|for|in|if|else|match|return|while|loop|break|continue|true|false|None|Some|Ok|Err|self|Self|super|crate|where|type|async|await|move|ref|static|extern|unsafe|dyn|Box|Vec|String|str|bool|i8|i16|i32|i64|u8|u16|u32|u64|f32|f64|usize)\b/g,
    sql: /\b(SELECT|FROM|WHERE|JOIN|LEFT|RIGHT|INNER|OUTER|ON|GROUP BY|ORDER BY|HAVING|INSERT|INTO|VALUES|UPDATE|SET|DELETE|CREATE|TABLE|ALTER|DROP|INDEX|VIEW|AS|AND|OR|NOT|IN|LIKE|BETWEEN|IS|NULL|DISTINCT|COUNT|SUM|AVG|MIN|MAX|LIMIT|OFFSET|UNION|ALL|EXISTS|PRIMARY|KEY|FOREIGN|REFERENCES|DEFAULT|CONSTRAINT|UNIQUE)\b/gi,
    'c++': /\b(int|long|short|char|float|double|bool|void|auto|const|static|extern|inline|class|struct|public|private|protected|virtual|override|new|delete|return|if|else|for|while|do|switch|case|break|continue|namespace|using|include|template|typename|nullptr|true|false|this|throw|try|catch)\b/g,
  };

  const kw = keywords[lang?.toLowerCase()] || keywords.javascript;
  escaped = escaped.replace(kw, '<span class="kw">$&</span>');
  escaped = escaped.replace(/\b(\d+\.?\d*)\b/g, '<span class="num">$1</span>');
  escaped = escaped.replace(/\b([a-zA-Z_]\w*)\s*(?=\()/g, '<span class="fn">$1</span>');

  strings.forEach((s, i) => {
    escaped = escaped.replace(`__STRING_${i}__`, `<span class="str">${s}</span>`);
  });
  comments.forEach((c, i) => {
    escaped = escaped.replace(`__COMMENT_${i}__`, `<span class="cm">${c}</span>`);
  });

  return escaped;
}

window.syntaxHighlight = syntaxHighlight;
window.escHtml = escHtml;
