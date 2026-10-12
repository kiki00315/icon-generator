# 幾何学アイコンジェネレーター（Geometric Icon Generator）

名前などの文字から、幾何学の模様のアイコンを作る Web ツールです。
**同じ文字からは、いつも同じアイコン**ができます。ブログやポートフォリオのプロフィール画像、ファビコンに使えます。
Vite + TypeScript で作っていて、ライブラリは使っていません（実行時の依存はゼロです）。

**デモ：** https://kiki00315.github.io/icon-generator/

![画面のスクリーンショット](docs/screenshot.png)

## できること

- 名前（文字）から、模様を自動で作る。「ランダム」ボタンと、12 個の候補つき
- 色のパレット 5 種類（最初は「紙とえんぴつ」）、マスの数（3〜8）、切り抜きの形（四角・角丸・丸）、左右対称の切りかえ
- **色見本ジェネレーターで作った・保存したパレットで、アイコンを作れる**（下の「色見本ジェネレーターの色を使う」を見てください）
- 64px / 32px / 16px に小さくしたときの見え方を、その場で確認できる
- **SVG・PNG で保存**、SVG のコードをコピー

## 色見本ジェネレーターの色を使う

色見本ジェネレーター（[ポートフォリオ版](https://kiki-portfolio.kiki-works.workers.dev/color-generator) / [単体版のリポジトリ](https://github.com/kiki00315/colour-palette-generator)）には、**「アイコンに使う」ボタン**があります。

- 画面の下のボタン：**今のパレット**を渡します。
- 保存したパレットのカード：**そのパレット**を渡します。

押すと、このツールが新しいタブで開き、色の選択肢の先頭に「色見本ジェネレーターのパレット」が入って、**最初から選ばれます**。ほかのパレットにも、切りかえられます。

仕組みは、色をアドレスの `#` のうしろに載せるだけです。

```
https://kiki00315.github.io/icon-generator/#colors=2D3A2E,4F6D44,88A66B
```

- 2 色〜8 色（`#` なしの 16 進数）を、カンマでつなぎます。
- `#` のうしろは、サーバーに送られません。保存したパレットが、外に出ることはありません。
- 外から来た文字なので、1 つずつ「正しい色か」を調べます（`parseColorsParam`）。1 つでもおかしければ、まるごと受け取らず、ふつうの画面で開きます（「色を読みこめませんでした」と知らせます）。
- 同じ色は 1 つにまとめます（図形が見えなくなるため）。まとめて 2 色未満になったときも、受け取りません。
- 2 つのツールは、別のアドレスにあるので、ブラウザの保存領域（localStorage）は共有できません。アドレスで渡すのは、そのためです。

## 動かし方

```bash
npm install
npm run dev        # 開発用サーバー（http://localhost:5173/icon-generator/）
npm test           # テスト（21 個）
npm run typecheck  # 型のチェック
npm run build      # 公開用のファイルを dist/ に作る
```

## 公開のしくみ

`main` に push（PR をマージ）すると、GitHub Actions が、型チェック → テスト → ビルドをして、GitHub Pages に自動で公開します（`.github/workflows/pages.yml`）。
途中の 1 つでも失敗すると、公開されません。

公開のアドレスが `…/icon-generator/` のように、リポジトリの名前を含むので、`vite.config.ts` で `base: '/icon-generator/'` を設定しています。

## 仕組み

SVG は、図形を**文字で書いた画像**です。このツールは、その文字を計算で組み立てているだけです。

```
名前（文字）
   ↓ ① 文字を数に変える（hashString）
   ↓ ② その数から、決まった順番の乱数を作る（createRandom）
   ↓ ③ 乱数で、マスごとに「図形・向き・色」を決める（designCells）
   ↓ ④ 各マスを SVG の部品にして、つなぎ合わせる（generateIcon）
SVG の文字列 → 画面に表示 / ファイルに保存
```

- **同じ文字なら同じ絵になる理由:** 乱数を「seed（種）」から作っているからです。種が同じなら、出てくる数の並びも同じになります（`src/random.ts`）。
- **図形は 6 種類:** 円・4 分の円・半円・三角・ひし形・輪っか。それぞれ、マスの中の座標を計算して描きます（`src/generate.ts` の `shapeMarkup`）。
- **左右対称:** 左半分だけ作り、右半分は、同じマスを**横に反転**して置きます（`scale(-1 1)`）。
- **PNG の作り方:** SVG を画像として読みこみ、`canvas` に描いて、PNG として取り出します（`src/main.ts` の `svgToPng`）。

## 安全のための工夫

SVG は文字でできているので、変な文字を入れられると、`<script>` などを混ぜられるおそれがあります。

- SVG に入れる**色は、`#RRGGBB` などの形かを、先にチェック**します（`isHexColor`）。ちがう形はエラーにします。
- 入力した名前は、**SVG の中には入れません**（乱数の種にだけ使う）。クリップの名前も、設定から計算した値です。
- **他のツールから受け取る色も、同じように調べます**（`parseColorsParam`）。アドレスの `#colors=` は、だれでも書きかえられる外からの文字だからです。1 つでもおかしければ、まるごと受け取りません。
- これらを、テストで確かめています（`test/generate.test.ts`）。`<script>` を混ぜた入力や、`red` のような色名、9 色以上の入力が、受け取られないことも含みます。

## TypeScript で使っている機能

| 機能 | 使っている場所 | ひとこと |
| --- | --- | --- |
| **型（interface）** | `IconOptions`, `State`, `Palette` | 「こういう形のデータ」という約束。足りない項目や、まちがった種類を、動かす前に教えてくれる |
| **ユニオン型** | `ShapeKind`, `Mask` | `'circle' \| 'quarter' …` のように、決まった文字のどれかだけを許す。打ちまちがいを防ぐ |
| **readonly** | `colors: readonly string[]` | あとから書きかえられない配列。パレットを、うっかり壊さない |
| **ジェネリクス** | `must<T extends HTMLElement>` | 「この部品は input だよ」と呼ぶときに伝えると、`.value` などの専用の機能が使える |
| **型ガード** | `isMask(value): value is Mask` | 調べた結果を、TypeScript に教える。`true` のあとは、その値を `Mask` として扱える |
| **型の絞りこみ（narrowing）** | `imported: Palette \| null`, `readImportedPalette()` | 「`null` かもしれない」値を、`if (imported)` で確かめると、そのあとは `Palette` として使える。関数の中で代入した値は、TypeScript が追いきれず「いつも `null`」と判断してしまうので、**値を返す関数**にして代入した |
| **厳しい設定** | `strict`, `noUncheckedIndexedAccess` | 配列の `[0]` は「ないかもしれない」型になり、`undefined` の見落としを防ぐ |

## ファイル

| ファイル | 内容 |
| --- | --- |
| `src/random.ts` | 文字 → 数 → 乱数 |
| `src/palettes.ts` | 色のパレット、色の書き方のチェック、他のツールから受け取る色の読みとり（`parseColorsParam`） |
| `src/generate.ts` | アイコン（SVG の文字列）を作る中心の部分。画面には触らない |
| `src/main.ts` | 画面の動き（入力・表示・保存・コピー・受け取った色の読みこみ） |
| `src/style.css` | 見た目 |
| `vite.config.ts` | ビルドの設定（GitHub Pages 用に、アドレスの `base` を設定） |
| `.github/workflows/pages.yml` | `main` に push すると、テスト・ビルドをして、GitHub Pages に自動で公開する |
| `test/generate.test.ts` | テスト（21 個）：乱数・色のチェック・SVG の作り方・色の受け取り |
| `docs/screenshot.png` | README 用のスクリーンショット |

## 作った人

KIKI — ポートフォリオ：https://kiki-portfolio.kiki-works.workers.dev/
