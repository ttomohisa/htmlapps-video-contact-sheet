# Video Contact Sheet

動画全体から **12枚 / 24枚 / 48枚** のフレームを均等に取り出し、一枚のコンタクトシート画像にまとめるブラウザツールです。映画・監視カメラ・長時間録画の流れを一目で確認できます。

## 主な機能

- 動画選択直後、ブラウザーでデコードできる形式は軽量サムネイルを自動表示（取得できない形式は通常アイコンへフォールバック）
- 12枚 / 24枚 / 48枚を動画全体から均等に取得
- MP4/MOV、MKV/WebM、AVI、MPEG-TSなどに対応
- H.264、HEVC/H.265（Pixelのhvc1/Main10を含む）、VP8/VP9、AV1、MPEG-4、MJPEG、ProRes等
- 各コマへの時刻表示
- **生成画像を全画面で拡大確認**：スマホはピンチ＋ドラッグ、PCはホイール＋ドラッグ、100% / 全体表示切替
- PNG / JPEG保存
- **出力ファイル名を編集可能**。形式切替時は拡張子を自動調整
- 動画と枚数設定が前回と同じ状態で再生成する場合は確認
- 入力はWORKERFSで扱い、大きな動画全体を最初にMEMFSへコピーしない
- 実行時ネットワーク通信を `connect-src 'none'` で遮断
- スマホは下部固定バー：**動画 / 枚数 / 生成 / 保存**
- 日本語 / English
- 単一HTML + 自己解凍HTML

## すぐ使う

生成済みの `video-contact-sheet.html` をChrome / Edgeなどのモダンブラウザで開きます。

1. 動画を選択またはドロップ
2. 12 / 24 / 48枚を選択
3. **コンタクトシートを生成**
4. プレビューをタップして必要なら拡大確認
5. 必要なら保存ファイル名を変更
6. PNGまたはJPEGで保存

## ビルド

FFmpegのJS/WASMバイナリはソースリポジトリへ直接置きません。`dependencies.json` で **FFmpeg WASM Builder v1.3.0** の `video-contact-sheet` Release assetを固定しています。

Windowsで：

```bat
build-standalone.bat
```

初回ビルド時にGitHub Releaseを取得し、`SHA256SUMS.txt` で検証してから `ffmpeg.js` / `ffmpeg.wasm` を単一HTMLへ組み込みます。

生成物：

```text
dist/index.html
dist/index.self-extract.html
dist/dependency-manifest.json
video-contact-sheet.html
```

通常のビルドにPython、Node.js、ローカルWebサーバーは不要です。

## リポジトリ構成

`htmlapps-lossless-video-cutter` と同じ構成に揃えています。

```text
.
├─ src/index.template.html
├─ dependencies.json
├─ app.config.json
├─ build-standalone.bat
├─ build-standalone.ps1
├─ update-ffmpeg.bat
├─ scripts/
├─ schemas/
├─ docs/
├─ dist/
└─ .github/workflows/
   ├─ build-standalone.yml
   ├─ validate.yml
   └─ deploy-pages.yml
```

## FFmpeg WASMを更新する

```bat
update-ffmpeg.bat 1.4.0
```

Release取得、SHA-256検証、再ビルドまで行い、失敗時は以前のバージョンへ戻します。

## プライバシー

選択した動画は端末内で処理され、アプリから外部へアップロードしません。GitHub Pages版ではHTML自体の配信は発生しますが、動画内容を送信する処理はありません。

## ライセンス

アプリケーションソースはMIT Licenseです。生成単一HTMLに含まれるFFmpeg WebAssembly coreはLGPL-2.1-or-laterです。詳細は `THIRD_PARTY_NOTICES.md` を参照してください。

### 単一HTMLの軽量化

単一HTMLには、固定したBuilder Releaseの `ffmpeg.js.gz` / `ffmpeg.wasm.gz` を圧縮状態のまま格納します。生成を初めて実行するときだけブラウザー内で展開します。FFmpeg coreや生成品質、オフライン動作は変えずにHTML容量を抑えます。
