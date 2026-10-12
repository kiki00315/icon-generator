// 画面の動き（入力を受けて、アイコンを作りなおして表示する）。
import './style.css';
import { generateIcon, MAX_GRID, MIN_GRID, type IconOptions, type Mask } from './generate';
import { findPalette, PALETTES } from './palettes';

/** 画面の設定の状態 */
interface State {
  seed: string;
  paletteId: string;
  grid: number;
  symmetric: boolean;
  mask: Mask;
}

const state: State = {
  seed: 'KIKI',
  paletteId: PALETTES[0]?.id ?? 'matcha',
  grid: 5,
  symmetric: true,
  mask: 'rounded',
};

/**
 * id で HTML の部品を探す。ジェネリクス（<T extends HTMLElement>）：
 * 呼ぶときに「この部品は input だよ」と型を伝えると、input 専用の機能（.value など）が使える。
 */
function must<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) throw new Error(`#${id} が見つかりません`);
  return element as T;
}

const seedInput = must<HTMLInputElement>('seed');
const paletteSelect = must<HTMLSelectElement>('palette');
const gridInput = must<HTMLInputElement>('grid');
const gridOut = must<HTMLOutputElement>('grid-out');
const symmetricInput = must<HTMLInputElement>('symmetric');
const chips = must<HTMLDivElement>('chips');
const cands = must<HTMLDivElement>('cands');
const toastBox = must<HTMLDivElement>('toast');

/** 今の状態を、アイコンの設定に直す。seed だけ差しかえたいとき（候補）に、seedOverride を使う */
function toOptions(seedOverride?: string): IconOptions {
  return {
    seed: seedOverride ?? (state.seed || ' '), // 空だと困るので、空のときは空白 1 文字にする
    colors: findPalette(state.paletteId).colors,
    grid: state.grid,
    symmetric: state.symmetric,
    mask: state.mask,
  };
}

/** 現在のアイコン（SVG の文字列） */
function currentSvg(size = 240): string {
  return generateIcon({ ...toOptions(), size });
}

function render(): void {
  const svg = currentSvg();
  must('preview').innerHTML = svg;
  for (const px of [64, 32, 16]) must(`size-${px}`).innerHTML = svg;

  chips.replaceChildren(
    ...findPalette(state.paletteId).colors.map((color) => {
      const chip = document.createElement('i');
      chip.style.background = color;
      return chip;
    }),
  );
  gridOut.textContent = `${state.grid} × ${state.grid}`;

  // 候補：今の名前に、-1, -2 … をつけた別の seed で 12 個作る
  cands.replaceChildren(
    ...Array.from({ length: 12 }, (_, i) => {
      const seed = `${state.seed || ' '}-${i + 1}`;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'cand';
      button.setAttribute('aria-label', `候補 ${i + 1} を使う`);
      button.innerHTML = generateIcon(toOptions(seed));
      button.addEventListener('click', () => {
        state.seed = seed;
        seedInput.value = seed;
        render();
      });
      return button;
    }),
  );
}

/* ---- 保存・コピー ---- */
let toastTimer: number | undefined;
function toast(message: string): void {
  toastBox.textContent = message;
  toastBox.classList.add('show');
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toastBox.classList.remove('show'), 1600);
}

/** ファイル名：英数字とハイフンだけにする（日本語やスペースは「icon」に置きかえる） */
function fileBase(): string {
  const safe = state.seed.replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '');
  return `icon-${safe || 'icon'}`;
}

function saveBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

/** SVG を PNG に変える：SVG を画像として読みこみ、canvas に描いて、PNG として取り出す */
async function svgToPng(svg: string, px: number): Promise<Blob> {
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = px;
    canvas.height = px;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('canvas を使えません');
    context.drawImage(image, 0, 0, px, px);
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('PNG を作れませんでした'))), 'image/png');
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

must('download-svg').addEventListener('click', () => {
  saveBlob(new Blob([currentSvg()], { type: 'image/svg+xml' }), `${fileBase()}.svg`);
  toast('SVG を保存しました');
});

must('download-png').addEventListener('click', async () => {
  try {
    saveBlob(await svgToPng(currentSvg(512), 512), `${fileBase()}.png`);
    toast('PNG を保存しました');
  } catch {
    toast('PNG を保存できませんでした');
  }
});

must('copy-svg').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(currentSvg());
    toast('SVG をコピーしました');
  } catch {
    toast('コピーできませんでした');
  }
});

/* ---- 設定の入力 ---- */
seedInput.value = state.seed;
seedInput.addEventListener('input', () => {
  state.seed = seedInput.value;
  render();
});

must('shuffle').addEventListener('click', () => {
  state.seed = Math.random().toString(36).slice(2, 8);
  seedInput.value = state.seed;
  render();
});

for (const palette of PALETTES) {
  paletteSelect.append(new Option(palette.name, palette.id));
}
paletteSelect.value = state.paletteId;
paletteSelect.addEventListener('change', () => {
  state.paletteId = paletteSelect.value;
  render();
});

gridInput.min = String(MIN_GRID);
gridInput.max = String(MAX_GRID);
gridInput.value = String(state.grid);
gridInput.addEventListener('input', () => {
  state.grid = Number(gridInput.value);
  render();
});

symmetricInput.checked = state.symmetric;
symmetricInput.addEventListener('change', () => {
  state.symmetric = symmetricInput.checked;
  render();
});

/** 値が Mask のどれかか調べる（型ガード：true のとき、TypeScript が「これは Mask 型だ」と理解する） */
function isMask(value: string): value is Mask {
  return value === 'square' || value === 'rounded' || value === 'circle';
}

for (const radio of document.querySelectorAll<HTMLInputElement>('input[name="mask"]')) {
  radio.checked = radio.value === state.mask;
  radio.addEventListener('change', () => {
    if (radio.checked && isMask(radio.value)) {
      state.mask = radio.value;
      render();
    }
  });
}

render();
