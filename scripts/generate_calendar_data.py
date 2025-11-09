"""
学年暦データをJSONに変換するスクリプト
"""

import json
from datetime import datetime, timedelta

YEAR = 2025


def date_range(start_date, end_date):
    """日付範囲を生成"""
    dates = []
    current = start_date
    while current <= end_date:
        dates.append(current)
        current += timedelta(days=1)
    return dates


# 学期
SEMESTER_PERIOD = {
    "1学期": [datetime(YEAR, 4, 16), datetime(YEAR, 6, 10)],
    "2学期": [datetime(YEAR, 6, 13), datetime(YEAR, 7, 31)],
    "3学期": [datetime(YEAR, 9, 19), datetime(YEAR, 11, 10)],
    "4学期": [datetime(YEAR, 11, 18), datetime(YEAR + 1, 1, 26)],
}

# 放假信息
VACATIONS = [
    # 一学期
    {
        "name": "春休み",
        "period": date_range(datetime(YEAR, 4, 1), datetime(YEAR, 4, 15)),
    },
    {"name": "昭和の日（4/29）の振替休講日", "period": [datetime(YEAR, 5, 1)]},
    {"name": "海の⽇（7/21）の振替休講日", "period": [datetime(YEAR, 5, 2)]},
    {"name": "憲法記念⽇", "period": [datetime(YEAR, 5, 3)]},
    {"name": "みどりの日", "period": [datetime(YEAR, 5, 4)]},
    {"name": "こどもの日", "period": [datetime(YEAR, 5, 5)]},
    {"name": "振替休日", "period": [datetime(YEAR, 5, 6)]},
    {"name": "創立記念日（同慶節）", "period": [datetime(YEAR, 5, 21)]},
    {
        "name": "試験・補講",
        "period": date_range(datetime(YEAR, 6, 11), datetime(YEAR, 6, 12)),
    },
    # 二学期
    {
        "name": "試験・補講",
        "period": date_range(datetime(YEAR, 8, 1), datetime(YEAR, 8, 2)),
    },
    {
        "name": "夏休み",
        "period": date_range(datetime(YEAR, 8, 4), datetime(YEAR, 9, 18)),
    },
    # 三学期
    {"name": "摩耶祭準備", "period": [datetime(YEAR, 10, 10)]},
    {"name": "スポーツの日・摩耶祭⽚付け", "period": [datetime(YEAR, 10, 13)]},
    {
        "name": "試験・補講",
        "period": date_range(datetime(YEAR, 11, 11), datetime(YEAR, 11, 13)),
    },
    {"name": "黎明祭準備", "period": [datetime(YEAR, 11, 14)]},
    {"name": "黎明祭⽚付け", "period": [datetime(YEAR, 11, 17)]},
    # 四学期
    {"name": "授業回調整（休講日）", "period": [datetime(YEAR, 12, 23)]},
    {"name": "秋分の日（9/23）の振替休講日", "period": [datetime(YEAR, 12, 24)]},
    {"name": "文化の日（11/3）の振替休講日", "period": [datetime(YEAR, 12, 25)]},
    {"name": "振替休日（11/24）の振替休講日", "period": [datetime(YEAR, 12, 26)]},
    {
        "name": "冬休み",
        "period": date_range(datetime(YEAR, 12, 29), datetime(YEAR + 1, 1, 5)),
    },
    {"name": "成人の日", "period": [datetime(YEAR + 1, 1, 12)]},
    {"name": "授業回調整（休講日）", "period": [datetime(YEAR + 1, 1, 13)]},
    {"name": "大学入学共通テスト準備（休講日）", "period": [datetime(YEAR + 1, 1, 16)]},
    {"name": "試験・補講", "period": [datetime(YEAR + 1, 1, 21)]},
    {"name": "試験・補講", "period": [datetime(YEAR + 1, 1, 22)]},
    {"name": "試験・補講", "period": [datetime(YEAR + 1, 1, 27)]},
    {
        "name": "春休み",
        "period": date_range(datetime(YEAR + 1, 1, 28), datetime(YEAR + 1, 3, 31)),
    },
]


def process_semester_period():
    """学期データをJSON形式に変換"""
    result = {}
    for key, value in SEMESTER_PERIOD.items():
        result[key] = [v.strftime("%Y-%m-%d") for v in value]
    return result


def process_vacations():
    """休日データをJSON形式に変換"""
    result = []
    for vacation in VACATIONS:
        period = vacation["period"]
        if isinstance(period, list):
            result.append(
                {
                    "name": vacation["name"],
                    "dates": [
                        d.strftime("%Y-%m-%d") if isinstance(d, datetime) else d
                        for d in period
                    ],
                }
            )
        else:
            result.append(
                {"name": vacation["name"], "dates": [period.strftime("%Y-%m-%d")]}
            )
    return result


def main():
    """メイン処理"""
    data = {
        "year": YEAR,
        "semesters": process_semester_period(),
        "vacations": process_vacations(),
    }

    # 学期のマッピング（第一学期、第二学期、前期、第三学期、第四学期、後期）
    semester_mapping = {
        "第一学期": "1学期",
        "第二学期": "2学期",
        "前期": "1学期",  # 前期は1学期と2学期を合わせたもの
        "第三学期": "3学期",
        "第四学期": "4学期",
        "後期": "3学期",  # 後期は3学期と4学期を合わせたもの
    }

    data["semester_mapping"] = semester_mapping

    # 前期と後期の期間を計算
    data["semesters"]["前期"] = [
        data["semesters"]["1学期"][0],
        data["semesters"]["2学期"][1],
    ]
    data["semesters"]["後期"] = [
        data["semesters"]["3学期"][0],
        data["semesters"]["4学期"][1],
    ]

    with open("public/calendar_data.json", "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print("calendar_data.json を生成しました。")


if __name__ == "__main__":
    main()
