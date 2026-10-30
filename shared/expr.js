// Tiny expression evaluator for plan parameters. No eval.
// Supports numbers, named parameters, + - * / ( ).

export function evaluate(expr, lookup) {
  if (typeof expr === "number") return expr;
  if (typeof expr !== "string") throw new Error("expression must be number or string");
  const tokens = tokenize(expr);
  let i = 0;
  function peek() { return tokens[i]; }
  function consume() { return tokens[i++]; }
  function parseExpr() { return parseAdd(); }
  function parseAdd() {
    let left = parseMul();
    while (peek() === "+" || peek() === "-") {
      const op = consume();
      const right = parseMul();
      left = op === "+" ? left + right : left - right;
    }
    return left;
  }
  function parseMul() {
    let left = parseUnary();
    while (peek() === "*" || peek() === "/") {
      const op = consume();
      const right = parseUnary();
      left = op === "*" ? left * right : left / right;
    }
    return left;
  }
  function parseUnary() {
    if (peek() === "-") { consume(); return -parseUnary(); }
    if (peek() === "+") { consume(); return parseUnary(); }
    return parsePrimary();
  }
  function parsePrimary() {
    if (peek() === "(") { consume(); const v = parseExpr(); if (consume() !== ")") throw new Error("missing )"); return v; }
    const t = consume();
    if (t === undefined) throw new Error("unexpected end");
    if (typeof t === "number") return t;
    if (typeof t === "string" && /^[A-Za-z_]/.test(t)) return lookup(t);
    throw new Error(`unexpected token ${t}`);
  }
  const result = parseExpr();
  if (i < tokens.length) throw new Error("trailing tokens");
  if (!Number.isFinite(result)) throw new Error("non-finite result");
  return result;
}

function tokenize(s) {
  const tokens = [];
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (/\s/.test(c)) { i++; continue; }
    if ("+-*/()".includes(c)) { tokens.push(c); i++; continue; }
    if (/[0-9.]/.test(c)) {
      let j = i;
      while (j < s.length && /[0-9.]/.test(s[j])) j++;
      tokens.push(parseFloat(s.slice(i, j)));
      i = j;
      continue;
    }
    if (/[A-Za-z_]/.test(c)) {
      let j = i;
      while (j < s.length && /[A-Za-z0-9_]/.test(s[j])) j++;
      tokens.push(s.slice(i, j));
      i = j;
      continue;
    }
    throw new Error(`invalid character ${c}`);
  }
  return tokens;
}

export function resolveParameters(parameters) {
  const values = {};
  const errors = {};
  const pending = new Map(parameters.map((p) => [p.name, p.expr]));
  const visiting = new Set();
  function resolve(name) {
    if (name in values) return values[name];
    if (visiting.has(name)) throw new Error(`circular parameter ${name}`);
    if (!(name in pending)) throw new Error(`unknown parameter ${name}`);
    visiting.add(name);
    try {
      values[name] = evaluate(pending.get(name), resolve);
    } catch (e) {
      errors[name] = e.message;
      values[name] = NaN;
    }
    visiting.delete(name);
    return values[name];
  }
  for (const p of parameters) {
    if (p.unit === "text") { values[p.name] = p.expr; continue; }
    resolve(p.name);
  }
  return { values, errors };
}
