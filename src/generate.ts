// アイコン（SVG の文字列）を作る、このツールの中心の部分。
// 画面には触らず、「設定を渡すと SVG の文字列が返る」だけの関数にしてある（テストしやすい）。

import { createRandom, hashString, randomInt } from './random';
import { isHexColor } from './palettes';

/** 1 マスに描く図形の種類。ユニオン型：ここに書いた文字列のどれかしか入れられない */
export type ShapeKind = 'circle' | 'quarter' | 'half' | 'triangle' | 'diamond' | 'ring';

/** アイコン全体の切り抜きの形 */
export type Mask = 'square' | 'rounded' | 'circle';

/** 設定。? がついた項目は、なくてもよい */
export interface IconOptions {
  /** 名前など。同じ文字なら、いつも同じアイコンになる */
  readonly seed: string;
  /** 使う色（2 色以上）。#RRGGBB の形 */
  readonly colors: readonly string[];
  /** マスの数（縦と横）。3〜8 */
  readonly grid: number;
  /** 左右対称にするか */
  readonly symmetric: boolean;
  readonly mask: Mask;
  /** SVG の大きさ（px）。省略すると 240 */
  readonly size?: number;
}

export const SHAPES: readonly ShapeKind[] = ['circle', 'quarter', 'half', 'triangle', 'diamond', 'ring'];
export const MIN_GRID = 3;
export const MAX_GRID = 8;

/** 1 マスの設計図 */
interface Cell {
  readonly shape: ShapeKind;
  /** 90 度ずつ回す回数（0〜3） */
  readonly turns: number;
  /** 背景の色の番号 */
  readonly background: number;
  /** 図形の色の番号 */
  readonly foreground: number;
}

/** 小数を 2 桁にまるめて、SVG の文字を短くする */
const fmt = (n: number): string => String(Math.round(n * 100) / 100);

/** 設定が正しいか調べる。おかしければ、わかりやすいエラーにする */
function validate(options: IconOptions): void {
  if (options.colors.length < 2) throw new Error('色は 2 色以上、選んでください');
  const bad = options.colors.find((c) => !isHexColor(c));
  if (bad !== undefined) throw new Error(`色の書き方が正しくありません: ${bad}`);
  if (!Number.isInteger(options.grid) || options.grid < MIN_GRID || options.grid > MAX_GRID) {
    throw new Error(`マスの数は ${MIN_GRID}〜${MAX_GRID} の整数にしてください`);
  }
}

/** 乱数から、全マスの設計図を作る。左右対称のときは、左半分（と中央）だけ作って、右は左の鏡うつしにする */
function designCells(options: IconOptions): Cell[][] {
  const random = createRandom(hashString(options.seed));
  const { grid, colors } = options;
  const columns = options.symmetric ? Math.ceil(grid / 2) : grid;

  const rows: Cell[][] = [];
  for (let r = 0; r < grid; r++) {
    const row: Cell[] = [];
    for (let c = 0; c < columns; c++) {
      const background = randomInt(random, colors.length);
      // 図形の色は、背景と必ず違う色にする（同じだと見えなくなるため）
      const foreground = (background + 1 + randomInt(random, colors.length - 1)) % colors.length;
      row.push({
        shape: SHAPES[randomInt(random, SHAPES.length)] ?? 'circle',
        turns: randomInt(random, 4),
        background,
        foreground,
      });
    }
    rows.push(row);
  }
  return rows;
}

/** 図形 1 つ分の SVG。マスの左上を (0, 0)、1 辺を s として描く */
function shapeMarkup(shape: ShapeKind, s: number, color: string): string {
  const h = s / 2;
  switch (shape) {
    case 'circle':
      return `<circle cx="${fmt(h)}" cy="${fmt(h)}" r="${fmt(h)}" fill="${color}"/>`;
    case 'quarter': // 左上のかどを中心にした、4 分の 1 の円
      return `<path d="M0 0H${fmt(s)}A${fmt(s)} ${fmt(s)} 0 0 1 0 ${fmt(s)}Z" fill="${color}"/>`;
    case 'half': // 上半分だけの円
      return `<path d="M0 ${fmt(h)}A${fmt(h)} ${fmt(h)} 0 0 1 ${fmt(s)} ${fmt(h)}Z" fill="${color}"/>`;
    case 'triangle': // 直角三角形
      return `<path d="M0 0H${fmt(s)}L0 ${fmt(s)}Z" fill="${color}"/>`;
    case 'diamond':
      return `<path d="M${fmt(h)} 0L${fmt(s)} ${fmt(h)}L${fmt(h)} ${fmt(s)}L0 ${fmt(h)}Z" fill="${color}"/>`;
    case 'ring': // 輪っか（中をぬかない円に、太い線をつける）
      return `<circle cx="${fmt(h)}" cy="${fmt(h)}" r="${fmt(s * 0.33)}" fill="none" stroke="${color}" stroke-width="${fmt(s * 0.2)}"/>`;
  }
}

/** 1 マス分の SVG（背景 + 図形）。mirrored が true なら左右を反転する */
function cellMarkup(cell: Cell, colors: readonly string[], x: number, y: number, s: number, mirrored: boolean): string {
  const background = colors[cell.background] ?? '#000000';
  const foreground = colors[cell.foreground] ?? '#ffffff';
  // 反転は「右はしに動かして、横に -1 倍」。そのあと、マスの中心を軸に回す
  const place = mirrored ? `translate(${fmt(x + s)} ${fmt(y)}) scale(-1 1)` : `translate(${fmt(x)} ${fmt(y)})`;
  const turn = cell.turns === 0 ? '' : ` rotate(${cell.turns * 90} ${fmt(s / 2)} ${fmt(s / 2)})`;
  return (
    `<g transform="${place}${turn}">` +
    `<rect width="${fmt(s)}" height="${fmt(s)}" fill="${background}"/>` +
    shapeMarkup(cell.shape, s, foreground) +
    '</g>'
  );
}

/** アイコンの SVG を、文字列で返す */
export function generateIcon(options: IconOptions): string {
  validate(options);
  const size = options.size ?? 240;
  const { grid, colors } = options;
  const s = size / grid;
  const rows = designCells(options);

  const cells: string[] = [];
  rows.forEach((row, r) => {
    row.forEach((cell, c) => {
      cells.push(cellMarkup(cell, colors, c * s, r * s, s, false));
    });
    if (options.symmetric) {
      // 右半分：左の列を、うしろから順に鏡うつしにして並べる（真ん中の列は 2 回描かない）
      const mirroredColumns = Math.floor(grid / 2);
      for (let c = 0; c < mirroredColumns; c++) {
        const source = row[c];
        if (source) cells.push(cellMarkup(source, colors, (grid - 1 - c) * s, r * s, s, true));
      }
    }
  });

  // 切り抜き（クリップ）の名前は、同じページに複数のアイコンを並べても重ならないよう、設定から作る
  const clipId = `clip-${hashString(`${options.seed}|${options.mask}|${grid}|${options.symmetric}|${colors.join('')}`).toString(36)}`;
  const clipShape =
    options.mask === 'circle'
      ? `<circle cx="${fmt(size / 2)}" cy="${fmt(size / 2)}" r="${fmt(size / 2)}"/>`
      : `<rect width="${size}" height="${size}" rx="${options.mask === 'rounded' ? fmt(size * 0.22) : 0}"/>`;

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" role="img" aria-label="幾何学の模様のアイコン">` +
    `<defs><clipPath id="${clipId}">${clipShape}</clipPath></defs>` +
    `<g clip-path="url(#${clipId})">${cells.join('')}</g>` +
    '</svg>'
  );
}
