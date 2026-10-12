import { describe, expect, it } from 'vitest';
import { generateIcon, MAX_GRID, MIN_GRID, type IconOptions } from '../src/generate';
import { createRandom, hashString } from '../src/random';
import { findPalette, isHexColor, PALETTES } from '../src/palettes';

const base: IconOptions = {
  seed: 'kiki',
  colors: ['#2D3A2E', '#4F6D44', '#88A66B', '#C9D8A8', '#F1F3E6'],
  grid: 5,
  symmetric: true,
  mask: 'rounded',
};

describe('乱数', () => {
  it('同じ文字からは、いつも同じ数が出る', () => {
    expect(hashString('kiki')).toBe(hashString('kiki'));
    expect(hashString('kiki')).not.toBe(hashString('kiko'));
    const a = createRandom(hashString('kiki'));
    const b = createRandom(hashString('kiki'));
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });

  it('0 以上 1 未満の数だけが出る', () => {
    const random = createRandom(123);
    for (let i = 0; i < 1000; i++) {
      const n = random();
      expect(n).toBeGreaterThanOrEqual(0);
      expect(n).toBeLessThan(1);
    }
  });
});

describe('色のチェック', () => {
  it('#RGB / #RRGGBB / #RRGGBBAA だけを通す', () => {
    expect(isHexColor('#fff')).toBe(true);
    expect(isHexColor('#2D3A2E')).toBe(true);
    expect(isHexColor('#2D3A2E80')).toBe(true);
    expect(isHexColor('red')).toBe(false);
    expect(isHexColor('#12')).toBe(false);
    expect(isHexColor('#fff"/><script>')).toBe(false);
  });

  it('用意したパレットは、すべて正しい色で、2 色以上ある', () => {
    for (const palette of PALETTES) {
      expect(palette.colors.length).toBeGreaterThanOrEqual(2);
      expect(palette.colors.every(isHexColor)).toBe(true);
    }
  });

  it('知らない id のときは、先頭のパレットになる', () => {
    expect(findPalette('nothing').id).toBe(PALETTES[0]?.id);
  });
});

describe('generateIcon', () => {
  it('SVG の文字列を返す', () => {
    const svg = generateIcon(base);
    expect(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg"')).toBe(true);
    expect(svg.endsWith('</svg>')).toBe(true);
    expect(svg).toContain('viewBox="0 0 240 240"');
  });

  it('同じ設定なら、いつも同じ SVG になる', () => {
    expect(generateIcon(base)).toBe(generateIcon({ ...base }));
  });

  it('seed が違えば、別の SVG になる', () => {
    expect(generateIcon(base)).not.toBe(generateIcon({ ...base, seed: 'someone-else' }));
  });

  it('数が NaN や Infinity にならない（どのマスの数でも）', () => {
    for (let grid = MIN_GRID; grid <= MAX_GRID; grid++) {
      for (const symmetric of [true, false]) {
        const svg = generateIcon({ ...base, grid, symmetric });
        expect(svg).not.toMatch(/NaN|Infinity|undefined/);
      }
    }
  });

  it('マスの数だけ背景の四角ができる（左右対称でも同じ）', () => {
    const count = (svg: string) => (svg.match(/<rect width=/g) ?? []).length - 1; // 切り抜き用の四角を 1 つ引く
    expect(count(generateIcon({ ...base, grid: 5, symmetric: true, mask: 'rounded' }))).toBe(25);
    expect(count(generateIcon({ ...base, grid: 4, symmetric: true, mask: 'rounded' }))).toBe(16);
    expect(count(generateIcon({ ...base, grid: 6, symmetric: false, mask: 'rounded' }))).toBe(36);
  });

  it('切り抜きの形が、mask に合っている', () => {
    expect(generateIcon({ ...base, mask: 'circle' })).toMatch(/<clipPath id="[^"]+"><circle/);
    expect(generateIcon({ ...base, mask: 'square' })).toMatch(/<clipPath id="[^"]+"><rect width="240" height="240" rx="0"/);
    expect(generateIcon({ ...base, mask: 'rounded' })).toMatch(/rx="52.8"/);
  });

  it('size を変えると、viewBox と width が変わる', () => {
    const svg = generateIcon({ ...base, size: 512 });
    expect(svg).toContain('viewBox="0 0 512 512"');
    expect(svg).toContain('width="512" height="512"');
  });

  it('設定を変えると、clipPath の id も変わる（同じページに並べても重ならない）', () => {
    const id = (svg: string) => svg.match(/clipPath id="([^"]+)"/)?.[1];
    expect(id(generateIcon(base))).not.toBe(id(generateIcon({ ...base, seed: 'b' })));
    expect(id(generateIcon(base))).toBe(id(generateIcon({ ...base })));
  });

  it('SVG に入る色は、渡した色だけ', () => {
    const svg = generateIcon(base);
    const used = new Set(svg.match(/#[0-9A-Fa-f]{6}/g));
    for (const color of used) expect(base.colors).toContain(color);
  });

  it('seed に変な文字が入っていても、SVG に混ざらない', () => {
    const svg = generateIcon({ ...base, seed: '"><script>alert(1)</script>' });
    expect(svg).not.toContain('<script');
    expect(svg).not.toContain('alert');
  });

  it('おかしな設定は、わかりやすいエラーにする', () => {
    expect(() => generateIcon({ ...base, colors: ['#ffffff'] })).toThrow('2 色以上');
    expect(() => generateIcon({ ...base, colors: ['#ffffff', 'red'] })).toThrow('色の書き方');
    expect(() => generateIcon({ ...base, colors: ['#ffffff', '#000"/><script>'] })).toThrow('色の書き方');
    expect(() => generateIcon({ ...base, grid: 2 })).toThrow('マスの数');
    expect(() => generateIcon({ ...base, grid: 9 })).toThrow('マスの数');
    expect(() => generateIcon({ ...base, grid: 4.5 })).toThrow('マスの数');
  });
});
