-- facilities テーブルに暗証番号カラムを追加
ALTER TABLE facilities ADD COLUMN IF NOT EXISTS pin_code text;
