/** OS 種別 */
export type UaOs = "mac" | "windows" | "ios" | "android" | "other";

/** ブラウザ種別 */
export type UaBrowser = "safari" | "chrome" | "other";

export interface UaResult {
  os: UaOs;
  browser: UaBrowser;
}

/** 手動で選択可能な環境オプション（Step 2 のドロップダウン用） */
export const UA_OVERRIDE_OPTIONS: { id: string; os: UaOs; browser: UaBrowser; label: string }[] = [
  { id: "mac-chrome", os: "mac", browser: "chrome", label: "Mac + Chrome" },
  { id: "mac-safari", os: "mac", browser: "safari", label: "Mac + Safari" },
  { id: "windows-chrome", os: "windows", browser: "chrome", label: "Windows + Chrome" },
  { id: "windows-edge", os: "windows", browser: "chrome", label: "Windows + Edge" },
  { id: "ios-safari", os: "ios", browser: "safari", label: "iOS + Safari" },
  { id: "ios-chrome", os: "ios", browser: "chrome", label: "iOS + Chrome" },
  { id: "android-chrome", os: "android", browser: "chrome", label: "Android + Chrome" },
  { id: "other", os: "other", browser: "other", label: "その他" },
];

/**
 * navigator.userAgent / navigator.platform から OS とブラウザを判定
 */
export function getUA(): UaResult {
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  const platform = typeof navigator !== "undefined" ? navigator.platform : "";

  let os: UaOs = "other";
  if (/iPhone|iPad|iPod/.test(ua)) {
    os = "ios";
  } else if (/Android/.test(ua)) {
    os = "android";
  } else if (/Mac|Macintosh|MacIntel/.test(ua) || platform === "MacIntel") {
    os = "mac";
  } else if (/Win|Windows/.test(ua) || platform === "Win32") {
    os = "windows";
  }

  let browser: UaBrowser = "other";
  if (/Safari/.test(ua) && !/Chrome|Chromium|CriOS|Edg/.test(ua)) {
    browser = "safari";
  } else if (/Chrome|Chromium|CriOS|Edg/.test(ua)) {
    browser = "chrome";
  }

  return { os, browser };
}
