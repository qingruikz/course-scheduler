# 大学授業スケジュールジェネレーター

大学の授業スケジュールを自動生成する Web アプリケーションです。

## Python スクリプトの使い方

このプロジェクトには、学年暦データを管理するための 2 つの Python スクリプトが含まれています。

### 1. 年度ごとの JSON ファイルを生成する (`generate_calendar_data.py`)

各年度の学年暦データを JSON ファイルとして生成します。

#### 使用方法

```bash
python scripts/generate_calendar_data.py [年度]
```

#### 例

```bash
# 2025年度のデータを生成
python scripts/generate_calendar_data.py 2025

# 2026年度のデータを生成
python scripts/generate_calendar_data.py 2026
```

#### 出力

- `public/calendar_data_YYYY.json` ファイルが生成されます
- 年度を指定しない場合、デフォルトで 2025 年度のデータが生成されます

#### 生成されるデータ

- 学期の期間（1 学期、2 学期、3 学期、4 学期、前期、後期）
- 休日の情報（祝日、振替休日、試験期間、長期休暇など）
- 学期のマッピング情報

### 2. 複数年度の JSON ファイルを統合する (`merge_calendar_data.py`)

複数の年度の JSON ファイルを読み込み、統合して`calendar_data.json`を生成します。

#### 使用方法

```bash
python scripts/merge_calendar_data.py
```

#### 処理内容

1. `public/`フォルダまたは`src/`フォルダから`calendar_data_YYYY.json`形式のファイルを検索
2. 見つかったすべての年度のデータを読み込み
3. 統合データを作成（作成日時を含む）
4. `src/calendar_data.json`と`public/calendar_data.json`に保存

#### 出力

- `src/calendar_data.json` - アプリケーションで使用される統合データ
- `public/calendar_data.json` - 開発サーバーでアクセス可能な統合データ

#### 統合データの構造

```json
{
  "created_at": "2025-01-01",
  "years": {
    "2025": {
      "year": 2025,
      "semesters": { ... },
      "vacations": [ ... ],
      "semester_mapping": { ... }
    },
    "2026": {
      ...
    }
  }
}
```

## データ更新の手順

新しい年度のデータを追加する場合の手順：

1. **年度ごとの JSON ファイルを生成**

   ```bash
   python scripts/generate_calendar_data.py 2026
   ```

2. **統合データを更新**

   ```bash
   python scripts/merge_calendar_data.py
   ```

3. **アプリケーションを再ビルド**
   ```bash
   npm run build
   ```

## 注意事項

- `generate_calendar_data.py`は、スクリプト内に定義された学期期間と休日情報に基づいてデータを生成します
- 新しい年度のデータを追加する場合は、スクリプト内の日付情報を更新する必要があります
- `merge_calendar_data.py`は、`public/`フォルダと`src/`フォルダの両方を検索します
- 統合データの作成日時は、スクリプト実行時の日時が自動的に設定されます
