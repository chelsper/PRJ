// CSV quoting alone does not stop a spreadsheet from evaluating a cell as a formula.
export function csvCell(value: unknown) {
  let text = String(value ?? "");
  if (/^[\s\uFEFF]*[=+\-@\t\r\n]/u.test(text) || /^[\t\r\n]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}
