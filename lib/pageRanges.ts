export type PageRangeError = { error: string };

export function parsePageGroups(input: string, totalPages: number): number[][] | PageRangeError {
  const groups = input
    .split(",")
    .map((group) => group.trim())
    .filter(Boolean);

  if (groups.length === 0) {
    return { error: "Enter at least one page or page range." };
  }

  const result: number[][] = [];
  for (const group of groups) {
    const rangeMatch = group.match(/^(\d+)\s*-\s*(\d+)$/);
    const singleMatch = group.match(/^(\d+)$/);

    if (rangeMatch) {
      let start = parseInt(rangeMatch[1], 10);
      let end = parseInt(rangeMatch[2], 10);
      if (start > end) [start, end] = [end, start];
      if (start < 1 || end > totalPages) {
        return { error: `"${group}" is out of range — this PDF has ${totalPages} pages.` };
      }
      const pages: number[] = [];
      for (let page = start; page <= end; page++) pages.push(page - 1);
      result.push(pages);
    } else if (singleMatch) {
      const page = parseInt(singleMatch[1], 10);
      if (page < 1 || page > totalPages) {
        return { error: `Page ${page} is out of range — this PDF has ${totalPages} pages.` };
      }
      result.push([page - 1]);
    } else {
      return { error: `"${group}" isn't a valid page or range (try "1-3" or "5").` };
    }
  }

  return result;
}

export function parsePageList(input: string, totalPages: number): number[] | PageRangeError {
  const groups = parsePageGroups(input, totalPages);
  if ("error" in groups) return groups;
  const unique = Array.from(new Set(groups.flat()));
  unique.sort((a, b) => a - b);
  return unique;
}
