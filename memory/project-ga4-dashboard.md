# プロジェクト: GA4分析ダッシュボード刷新 (Next.js版)

## 概要
既存のStreamlit製「経営層向けGA4分析ダッシュボード」を、Next.js (Vercelデプロイ) ベースにリニューアルする。

## 目的
1.  **プラットフォーム移行**: Streamlit → Next.js (Vercel対応)
2.  **ターゲット拡大**: 経営層向け（サマリー）に加え、実担当者向け（詳細分析）機能を追加。
3.  **UI/UX刷新**: プレミアムでモダンなデザインへ。アニメーションやインタラクティブなグラフを導入。

## 技術スタック
- **Framework**: Next.js (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Visualization**: Recharts, Lucide React
- **Animation**: Framer Motion
- **Data Source**: Google Analytics Data API (GA4), Google Sheets API
- **AI**: Gemini API (Google Generative AI)

## ステータス
- 2026-02-09 09:22: プロジェクト開始。B案（Next.js移行）採用。プロトタイプ作成開始。
- 2026-02-09 13:24: 初版プロトタイプ（デザインのみ）をVercelにデプロイ完了。
- 2026-02-09 13:40: デザインアップデート中（チャート、アニメーション追加、SaaS風UIへ）。

## 次のステップ
1.  **デザイン確認**: アップデート後のUIを京さんに確認してもらう。
2.  **データ連携**: 実際のGA4データと接続する。
3.  **AI分析機能**: Gemini APIを組み込み、インサイト生成機能を移植する。
