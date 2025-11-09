/**
 * 和暦計算のユーティリティ関数
 */

/**
 * 西暦から和暦を計算
 * @param year 西暦年
 * @returns 和暦名と年号
 */
export function getJapaneseEra(year: number): { era: string; year: number } {
  if (year >= 2019) {
    // 令和: 2019年5月1日から
    // ただし、年度は4月から始まるため、4月1日以降は次の年度
    return { era: "令和", year: year - 2018 };
  } else if (year >= 1989) {
    // 平成: 1989年1月8日から
    return { era: "平成", year: year - 1988 };
  } else if (year >= 1926) {
    // 昭和: 1926年12月25日から
    return { era: "昭和", year: year - 1925 };
  } else if (year >= 1912) {
    // 大正: 1912年7月30日から
    return { era: "大正", year: year - 1911 };
  } else if (year >= 1868) {
    // 明治: 1868年1月25日から
    return { era: "明治", year: year - 1867 };
  } else {
    // それ以前は西暦のみ
    return { era: "西暦", year };
  }
}

/**
 * 年度の表示文字列を生成
 * @param year 西暦年
 * @returns 例: "2025(令和7)年度"
 */
export function formatAcademicYear(year: number): string {
  const { era, year: eraYear } = getJapaneseEra(year);
  return `${year}(${era}${eraYear})年度`;
}
