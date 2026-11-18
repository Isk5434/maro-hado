# まろいぬの覇道 デモ

MARO が制作するボードゲーム「まろいぬの覇道」（短縮版）を、ルール確認のためにブラウザで遊べるようにしたデモです。
1台の端末を回して2〜4人で遊ぶ「交代プレイ」に対応しています。

- 実装しているルールと、その根拠（紙・会議・確認済・仮）は [docs/rules.md](docs/rules.md) にまとめています。
- ルールの判定は `src/game/`（画面に依存しない TypeScript）にあり、`src/game/game.test.ts` でルールブックの記述ごとに確かめています。

## 使い方

```bash
npm install
npm run dev      # 開発サーバー http://localhost:5173
npm test         # ルールのテスト
npm run deploy   # ビルドして Cloudflare Workers に公開（要 wrangler login）
```

## 構成

| 層 | 技術 |
|---|---|
| ルール | TypeScript（純粋関数・シード付き乱数） |
| 画面 | React + Vite + Tailwind CSS |
| 状態 | Zustand（戻す機能つき） |
| テスト | Vitest |
| 公開 | Cloudflare Workers（静的アセット） |
