"""
複数の年度のJSONファイルを読み込み、統合してcalendar_data.jsonを生成するスクリプト
使用方法: python merge_calendar_data.py
各年度のJSONファイル（calendar_data_YYYY.json）をpublicフォルダから読み込み、
統合してsrc/calendar_data.jsonを生成します。
"""

import json
import os
from datetime import datetime
from pathlib import Path


def load_year_data(year: int) -> dict | None:
    """指定年度のJSONファイルを読み込む"""
    # publicフォルダから読み込む
    public_file = Path(f"public/calendar_data_{year}.json")
    if public_file.exists():
        with open(public_file, "r", encoding="utf-8") as f:
            return json.load(f)

    # srcフォルダから読み込む（フォールバック）
    src_file = Path(f"src/calendar_data_{year}.json")
    if src_file.exists():
        with open(src_file, "r", encoding="utf-8") as f:
            return json.load(f)

    return None


def find_available_years() -> list[int]:
    """利用可能な年度のJSONファイルを検索"""
    years = []

    # publicフォルダを検索
    public_dir = Path("public")
    if public_dir.exists():
        for file in public_dir.glob("calendar_data_*.json"):
            try:
                year_str = file.stem.replace("calendar_data_", "")
                year = int(year_str)
                years.append(year)
            except ValueError:
                continue

    # srcフォルダを検索（フォールバック）
    src_dir = Path("src")
    if src_dir.exists():
        for file in src_dir.glob("calendar_data_*.json"):
            try:
                year_str = file.stem.replace("calendar_data_", "")
                year = int(year_str)
                if year not in years:
                    years.append(year)
            except ValueError:
                continue

    return sorted(years)


def main():
    """メイン処理"""
    # 利用可能な年度を検索
    available_years = find_available_years()

    if not available_years:
        print("エラー: 年度データファイルが見つかりません。")
        print(
            "public/calendar_data_YYYY.json または src/calendar_data_YYYY.json を配置してください。"
        )
        return

    print(f"見つかった年度: {available_years}")

    # 各年度のデータを読み込む
    years_data = {}
    for year in available_years:
        data = load_year_data(year)
        if data:
            years_data[str(year)] = data
            print(f"  {year}年度のデータを読み込みました")
        else:
            print(f"  警告: {year}年度のデータを読み込めませんでした")

    if not years_data:
        print("エラー: 読み込める年度データがありません。")
        return

    # 統合データを作成
    merged_data = {
        "created_at": datetime.now().strftime("%Y-%m-%d"),
        "years": years_data,
    }

    # src/calendar_data.jsonに保存
    src_output_file = Path("src/calendar_data.json")
    src_output_file.parent.mkdir(parents=True, exist_ok=True)

    with open(src_output_file, "w", encoding="utf-8") as f:
        json.dump(merged_data, f, ensure_ascii=False, indent=2)

    print(f"統合データを {src_output_file} に保存しました。")

    # public/calendar_data.jsonにも保存（開発サーバーでアクセス可能にするため）
    public_output_file = Path("public/calendar_data.json")
    public_output_file.parent.mkdir(parents=True, exist_ok=True)

    with open(public_output_file, "w", encoding="utf-8") as f:
        json.dump(merged_data, f, ensure_ascii=False, indent=2)

    print(f"統合データを {public_output_file} に保存しました。")
    print(f"作成日: {merged_data['created_at']}")
    print(f"統合された年度数: {len(years_data)}")


if __name__ == "__main__":
    main()
