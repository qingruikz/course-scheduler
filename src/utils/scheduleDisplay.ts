/**
 * 同日に複数授業がある場合の回数表示をフォーマット
 * 連続: [1,2] -> "1-2"
 * 非連続: [1,3] -> "1,3"
 * 混在: [1,2,4,5] -> "1-2,4-5"
 */
export function formatClassNumbersDisplay(classNumbers: number[]): string {
  if (classNumbers.length === 0) return "";
  if (classNumbers.length === 1) return String(classNumbers[0]);

  const sorted = [...classNumbers].sort((a, b) => a - b);
  const ranges: string[] = [];
  let rangeStart = sorted[0]!;
  let rangeEnd = rangeStart;

  for (let i = 1; i < sorted.length; i++) {
    const n = sorted[i]!;
    if (n === rangeEnd + 1) {
      rangeEnd = n;
    } else {
      ranges.push(rangeStart === rangeEnd ? String(rangeStart) : `${rangeStart}-${rangeEnd}`);
      rangeStart = n;
      rangeEnd = n;
    }
  }
  ranges.push(rangeStart === rangeEnd ? String(rangeStart) : `${rangeStart}-${rangeEnd}`);
  return ranges.join(",");
}
