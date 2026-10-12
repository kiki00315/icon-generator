import { defineConfig } from 'vite';

// GitHub Pages では、https://<ユーザー名>.github.io/icon-generator/ のように、リポジトリの名前がアドレスに入る。
// そのため、ファイルを探す場所（base）を /icon-generator/ にしておく。
export default defineConfig({
  base: '/icon-generator/',
});
