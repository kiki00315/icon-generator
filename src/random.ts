// 文字から、いつも同じ乱数を作る仕組み。
// 同じ名前（seed）なら、いつでも同じアイコンになるようにするために使う。

/** 文字列を 0〜42億の整数に変える（FNV-1a というかんたんな方法）。同じ文字なら、いつも同じ数になる */
export function hashString(text: string): number {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/** 0 以上 1 未満の数を、呼ぶたびに返す関数。型エイリアス：「引数なしで number を返す関数」に名前をつけた */
export type Random = () => number;

/** 整数（seed）から乱数の関数を作る（mulberry32 という方法）。seed が同じなら、出てくる数の並びも同じ */
export function createRandom(seed: number): Random {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 0 以上 max 未満の整数を、乱数から 1 つ取り出す */
export function randomInt(random: Random, max: number): number {
  return Math.floor(random() * max);
}
