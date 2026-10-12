// 色の組み合わせ（パレット）の一覧と、色の書き方のチェック。

/** パレット：id（内部の名前）・name（画面に出す名前）・colors（色の一覧） */
export interface Palette {
  readonly id: string;
  readonly name: string;
  // readonly：あとから書きかえられない配列
  readonly colors: readonly string[];
}

export const PALETTES: readonly Palette[] = [
  { id: 'matcha', name: '抹茶', colors: ['#2D3A2E', '#4F6D44', '#88A66B', '#C9D8A8', '#F1F3E6'] },
  { id: 'seaside', name: '海辺の朝', colors: ['#0B3954', '#087E8B', '#BFD7EA', '#FF5A5F', '#C81D25'] },
  { id: 'paper', name: '紙とえんぴつ', colors: ['#3B3B3B', '#717171', '#B8B5AE', '#E8E4DA', '#FAF9F6'] },
  { id: 'sunset', name: '夕やけ', colors: ['#3D2C4D', '#8E3B5E', '#E0605A', '#F4A261', '#FBE3B8'] },
  { id: 'sky', name: '空とクレヨン', colors: ['#2F4DE0', '#7D92FF', '#A8E0F0', '#FFD166', '#FFFFFF'] },
];

/** id からパレットを探す。見つからなければ先頭のパレットを返す */
export function findPalette(id: string): Palette {
  // noUncheckedIndexedAccess により、PALETTES[0] は「ないかもしれない」型になるので、! で「必ずある」と伝える
  return PALETTES.find((p) => p.id === id) ?? PALETTES[0]!;
}

/** #RGB / #RRGGBB / #RRGGBBAA の形か調べる。SVG の中に入れる前に、変な文字が混ざっていないか確かめるため */
export function isHexColor(value: string): boolean {
  return /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(value);
}

/** 他のツール（色見本ジェネレーター）から受け取れる色の数 */
export const MIN_IMPORT_COLORS = 2;
export const MAX_IMPORT_COLORS = 8;

/**
 * アドレスで受け取った色（例："2D3A2E,4F6D44,88A66B"）を、["#2D3A2E", ...] に直す。
 * 外から来た文字なので、1 つずつ「正しい色か」を調べる。1 つでもおかしければ、まるごと受け取らない（null）。
 */
export function parseColorsParam(value: string | null): string[] | null {
  if (!value) return null;
  const colors: string[] = [];
  for (const part of value.split(',')) {
    const color = `#${part.trim().replace(/^#/, '')}`.toUpperCase();
    if (!isHexColor(color)) return null;
    if (!colors.includes(color)) colors.push(color); // 同じ色は 1 つにまとめる（図形が見えなくなるため）
  }
  return colors.length >= MIN_IMPORT_COLORS && colors.length <= MAX_IMPORT_COLORS ? colors : null;
}

/** 受け取った色を、パレットにする。id は 'imported' で固定 */
export const IMPORTED_ID = 'imported';
export function importedPalette(colors: readonly string[]): Palette {
  return { id: IMPORTED_ID, name: '色見本ジェネレーターのパレット', colors };
}
