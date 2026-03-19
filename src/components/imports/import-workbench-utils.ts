export function normalizeImportHeader(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

export function parseImportCsv(text: string) {
  const rows: string[][] = [];
  let current = "";
  let row: string[] = [];
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(current);
      current = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") {
        index += 1;
      }
      row.push(current);
      rows.push(row);
      row = [];
      current = "";
      continue;
    }

    current += char;
  }

  if (current.length > 0 || row.length > 0) {
    row.push(current);
    rows.push(row);
  }

  const trimmedRows = rows.filter((parsedRow) => parsedRow.some((cell) => cell.trim() !== ""));

  if (trimmedRows.length === 0) {
    return { headers: [], rows: [] as Array<Record<string, string>> };
  }

  const headers = trimmedRows[0].map((header, index) => (header.trim() ? header.trim() : `Column ${index + 1}`));
  const dataRows = trimmedRows.slice(1).map((parsedRow) =>
    headers.reduce<Record<string, string>>((accumulator, header, index) => {
      accumulator[header] = parsedRow[index]?.trim() ?? "";
      return accumulator;
    }, {})
  );

  return { headers, rows: dataRows };
}
