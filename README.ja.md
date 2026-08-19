# Video Contact Sheet

[![GitHub Pages](https://github.com/ttomohisa/htmlapps-video-contact-sheet/actions/workflows/deploy-pages.yml/badge.svg)](https://github.com/ttomohisa/htmlapps-video-contact-sheet/actions/workflows/deploy-pages.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Single HTML](https://img.shields.io/badge/distribution-single%20HTML-0ea5e9)](https://ttomohisa.github.io/htmlapps-video-contact-sheet/)

[English README](README.md)

動画全体から **12枚 / 24枚 / 48枚** のフレームを均等に取り出し、1枚のコンタクトシート画像へまとめる、プライバシー重視の単一HTMLアプリです。

映画、監視カメラ、画面録画、講義動画、長時間のカメラ映像などを、最初から最後までシークし続けなくても一目で確認できます。細かく見たいときは48枚、まず全体の流れを掴みたいときは12枚、と用途に応じて切り替えられます。

## 🚀 デモ

### [GitHub PagesでVideo Contact Sheetを開く](https://ttomohisa.github.io/htmlapps-video-contact-sheet/)

GitHub Pagesから最初のHTMLを読み込んだ後、選択した動画の読み込み、FFmpeg WebAssemblyによるシーク・フレーム取得、コンタクトシート生成、PNG/JPEG保存は端末内で処理されます。選択した動画がアプリからサーバーへアップロードされることはありません。

## 主な機能

- 動画全体から **12枚 / 24枚 / 48枚** を均等に取得して1枚の画像へまとめる
- 動画全体を先頭から順番にデコードせず、必要な位置へシークしてフレームを取得
- compact FFmpeg profileでMP4/MOV、MKV/WebM、AVI、MPEG-TSなどの一般的なコンテナに対応
- H.264、HEVC/H.265（Pixelの `hvc1` / Main10を含む）、VP8、VP9、AV1、MPEG-4、MJPEG、ProResなどをデコード
- 各コマに時刻を表示可能。元動画のどの辺りかを後から探しやすい
- 動画選択直後、ブラウザーが再生できる形式なら軽量なソースサムネイルを自動表示
- ブラウザーがサムネイルを取得できない形式では、待たせず通常の動画アイコンへ自動フォールバック
- 保存前に生成画像を**全画面で拡大確認**
- スマホはピンチで拡大・縮小、1本指ドラッグで移動
- PCはマウスホイールでズーム、ドラッグで移動
- **全体表示 / 100%** ボタンと、ダブルタップ / ダブルクリックによるズーム切り替え
- PNG / JPEG保存
- 保存前に出力ファイル名を編集可能。形式切替時は拡張子だけ自動調整
- 動画と12/24/48枚の設定が前回と同じ場合、重い処理を誤って再実行しないよう確認
- 入力はWORKERFSで扱い、大きな動画全体を最初にMEMFSへコピーしない
- スマホは下部固定バー：**動画 / 枚数 / 生成 / 保存**
- 日本語 / English切り替え
- SVG faviconをHTML内に埋め込み
- FFmpeg JavaScript / WebAssemblyをgzip圧縮状態で内包し、単一HTMLの容量を削減
- 通常版 `dist/index.html` と自己解凍版 `dist/index.self-extract.html` を生成
- 実行時ネットワーク通信を `connect-src 'none'` で遮断

## すぐに使う

### Webで使う

[デモを開く](https://ttomohisa.github.io/htmlapps-video-contact-sheet/)だけで利用できます。インストールやアカウント登録は不要です。

### 完全オフラインで使う（advanced）

1. このリポジトリをダウンロードまたはクローンします。
2. Windowsで `build-standalone.bat` を実行します。
3. 初回だけ、`dependencies.json` で固定されたFFmpeg WASM BuilderのReleaseを取得します。
4. Release ZIPと対応ソースが `SHA256SUMS.txt` に登録されたハッシュと一致することを確認します。
5. 生成された `dist/index.html` を任意の場所へコピーします。
6. 以降は、そのHTML単体をインターネット接続なしで直接開けます。

```powershell
.\build-standalone.bat
```

通常のビルドにPython、Node.js、ローカルWebサーバーは不要です。Windows PowerShellとGitHub Releaseを使用します。

## 使い方

1. 動画をドロップするか、ファイル選択から動画を選びます。
2. ブラウザーが動画を直接デコードできる場合は、選択済みカードに小さなサムネイルが表示されます。これは補助表示なので、取得できなくても生成には影響しません。
3. **12枚 / 24枚 / 48枚** から枚数を選びます。
4. 元動画の位置を後から確認したい場合は、時刻表示をONのまま使います。
5. **コンタクトシートを生成** を押します。
6. 生成結果を確認します。細かく見たい場合は画像をタップ / クリックして全画面の拡大ビューアを開きます。
7. 必要なら保存ファイル名を変更します。
8. PNGまたはJPEGで保存します。

### 枚数の目安

| 枚数 | 配置 | おすすめ用途 |
| ---: | --- | --- |
| **12枚** | 4 × 3 | まず動画全体の流れを素早く確認したい |
| **24枚** | 6 × 4 | 通常利用。見やすさと情報量のバランスが良い |
| **48枚** | 8 × 6 | 長時間動画や場面変化を細かく追いたい |

枚数を増やすほど時間方向の情報は細かくなりますが、1コマは小さくなります。スマートフォンで48枚を確認するときは、生成後の拡大ビューアを使うのがおすすめです。

### ズーム操作

| 操作 | 動作 |
| --- | --- |
| 生成画像をタップ / クリック | 全画面ビューアを開く |
| 2本指ピンチ | スマホ・タブレットで拡大 / 縮小 |
| 1本指ドラッグ | 拡大中の画像を移動 |
| マウスホイール | PCで拡大 / 縮小 |
| マウスドラッグ | PCで拡大中の画像を移動 |
| ダブルタップ / ダブルクリック | 全体表示と100%を切り替え |
| **全体表示** | 画像全体が画面に収まる倍率へ戻す |
| **100%** | 画像を実ピクセルサイズで表示 |

ズームは確認表示だけに作用します。生成した画像そのもの、保存解像度、PNG/JPEGの内容は変わりません。

### 出力ファイル名

初期値は元動画名と枚数を使って、たとえば次のようになります。

```text
movie_contact-sheet_24.png
```

保存前に自由に編集できます。PNG / JPEGを切り替えた場合も入力したベース名は保持し、拡張子だけを自動調整します。

### 同じ設定で再生成するとき

一度生成に成功すると、元動画の情報と選択した枚数を記録します。同じ動画・同じ12/24/48枚のままもう一度「生成」を押した場合は、同じ重い処理を誤って繰り返さないよう確認ダイアログを表示します。

動画を変更した場合や、12枚→24枚のように枚数を変えた場合は確認なしで生成します。

## 生成の仕組み

Video Contact Sheetは、長時間動画を先頭から最後まで全部デコードする方式ではありません。

1. 選択した `File` / `Blob` をWORKERFSでマウント
2. 動画全体に12 / 24 / 48個の取得位置を配置
3. 各取得位置付近へシーク
4. その地点で必要な1フレームだけデコード
5. RGBへ変換して1枚のコンタクトシートへ配置
6. 小さなシートデータをページ側へ返す
7. Canvasへ描画
8. 必要なら各コマへ時刻ラベルを描画
9. CanvasをPNG / JPEGとして保存

FFmpeg WASM側にPNG/JPEG encoderを追加する代わりに、runnerはRGB PPMのコンタクトシートを返します。最終的なPNG/JPEG化はブラウザー標準のCanvas APIで行うことで、FFmpeg coreを小さく保っています。

### 動画選択時のサムネイルは別処理

動画を選んだ直後に表示する小さなサムネイルは、FFmpeg WASMではなくブラウザー標準の `<video>` で取得します。動画の序盤から代表的な1フレームを小さく取り出すだけで、非同期で動作し、「生成」操作を待たせません。

そのため、ブラウザー側がHEVCや一部MKVを直接再生できない環境ではサムネイルが出ない場合があります。一方、コンタクトシート本体はFFmpeg WASMで生成するため、サムネイルが出なくても本生成は成功する場合があります。

## GitHub Pagesで公開する

このリポジトリには、完全内包版をビルドしてGitHub Pagesへ自動公開するワークフローが含まれています。

1. リポジトリ名を `htmlapps-video-contact-sheet` としてGitHubへプッシュします。
2. **Settings → Pages → Build and deployment → Source** で **GitHub Actions** を選択します。
3. `main` ブランチへプッシュするか、Actions画面からデプロイワークフローを手動実行します。
4. ビルド成功後、`https://ttomohisa.github.io/htmlapps-video-contact-sheet/` で公開されます。

Pagesがまだ有効化されていない場合、ワークフローは単一HTMLのビルドとArtifactアップロードまで行い、デプロイだけをスキップします。SettingsでGitHub Actionsを選択した後、ワークフローを再実行してください。

`main` へのプッシュ時には、固定バージョンのFFmpeg WASM Builder Releaseから単一HTMLを再生成し、リポジトリ検証を通過した成果物だけを公開します。

## 開発とビルド

```text
.
├─ src/index.template.html            # アプリ本体のテンプレート
├─ app.config.json                    # アプリ名・バージョン・出力設定
├─ dependencies.json                  # FFmpeg WASM Builderの固定Releaseと内包対象
├─ build-standalone.bat               # Windows用ビルド入口
├─ build-standalone.ps1               # 単一HTML生成処理
├─ update-ffmpeg.bat                   # 依存更新用入口
├─ scripts/
│  ├─ check-repository.ps1            # リポジトリ全体のビルド検証
│  ├─ check-source.ps1                # ソースと通信境界の検証
│  ├─ verify-standalone.ps1           # 通常版HTMLの検証
│  ├─ build-self-extract.ps1          # 自己解凍HTMLの生成
│  ├─ verify-self-extract.ps1         # 自己解凍版の検証
│  └─ update-ffmpeg.ps1               # Builderバージョン更新
├─ schemas/
│  ├─ app-config.schema.json
│  └─ dependencies.schema.json
├─ docs/
│  ├─ ARCHITECTURE.md
│  └─ LLM_WORKFLOW.md
├─ dist/
│  ├─ index.html                      # ビルド後の通常版
│  ├─ index.self-extract.html         # 自己解凍版
│  ├─ dependency-manifest.json        # 依存ハッシュ・対応ソース情報
│  └─ self-extract-manifest.json      # 自己解凍版の検証情報
└─ .github/workflows/
   ├─ build-standalone.yml            # ビルド検証とArtifact出力
   ├─ validate.yml                    # ソース + standalone検証
   └─ deploy-pages.yml                # mainからPagesへ自動公開
```

ソースリポジトリには、FFmpeg JavaScript / WebAssemblyを置くための `vendor/` ディレクトリを意図的に持たせていません。

### FFmpeg WASMを更新する

現在は `dependencies.json` で FFmpeg WASM Builder `v1.3.0` の `video-contact-sheet` profileを固定しています。

WindowsからBuilderバージョンを更新する場合：

```powershell
.\update-ffmpeg.bat 1.4.0
```

バージョンpinを更新して再ビルドし、失敗した場合は以前のバージョンへ戻します。

キャッシュを破棄して固定Releaseをもう一度取得する場合：

```powershell
.\build-standalone.bat -ForceDownload
```

ビルド処理は以下を自動で行います。

- GitHub Releasesから固定バージョンの `ffmpeg-wasm-video-contact-sheet-v{version}.zip` を取得
- `SHA256SUMS.txt` を取得
- profile ZIPのSHA-256を検証
- 対応ソースarchiveもchecksum一覧に存在することを確認
- Releaseに含まれる `ffmpeg.js.gz` / `ffmpeg.wasm.gz` を読み込む
- 圧縮状態のままBase64でHTMLへ1回だけ内包
- 実行時に `DecompressionStream('gzip')` で端末内展開
- Release URL、checksum、assetサイズ、対応ソース情報を `dist/dependency-manifest.json` に記録
- 外部runtime script / stylesheet / frame / CSS URLが残っていないことを検証
- `connect-src 'none'` を検証
- gzip自己解凍HTMLを生成
- 自己解凍版が元のHTMLへバイト単位で復元できることを検証

FFmpeg coreを未圧縮のままBase64化せず、Releaseのgzip済みassetをそのまま内包することで、動画処理の機能を変えずに通常版の単一HTMLサイズを大きく削減しています。

## プライバシーと通信防止

生成されたHTMLには以下の仕組みがあります。

- Content Security Policyに `connect-src 'none'` を設定
- 実行時の依存ライブラリダウンロードなし
- 外部runtime script / stylesheetなし
- 選択したローカル動画はBlob / WORKERFSとして端末内で読み込み
- FFmpeg JavaScript / WebAssemblyはgzip圧縮状態でHTML内に保持

GitHub Pages版では最初のHTMLを配信する通信は発生しますが、選択した動画、デコードしたフレーム、サムネイル、コンタクトシート、保存画像をアプリが外部へ送信することはありません。

完全にネットワークを切って使う場合は、生成された `dist/index.html` をローカルで開いてください。

## 対応形式と制限事項

- FFmpeg profileでは、MP4/MOV、MKV/WebM、AVI、MPEG-TS/PS、FLV、ASF、Oggなど、有効なdemuxerが識別できる一般的なコンテナに対応します。
- 有効な動画decoderにはH.264、HEVC/H.265、VP8、VP9、AV1、MPEG-4、MPEG-1/2、MJPEG、ProRes、Theoraなどがあります。
- PixelのHEVC動画で使われる `hvc1` / Main10は、ブラウザー標準再生ではなくFFmpeg生成側で処理します。
- 動画選択時の小さなサムネイルだけはブラウザー標準decoderに依存するため、コンタクトシートを生成できる動画でもサムネイルが表示されない場合があります。
- 破損ファイル、特殊なコンテナ、未対応codec profile、暗号化・保護されたメディア、不正なtimestampを持つ動画は処理できない場合があります。
- 48枚は12枚より大きな出力Canvasを使うため、端末メモリの使用量も増えます。ただし入力動画全体をMEMFSへ丸ごとコピーする方式ではありません。
- このアプリは動画全体を視覚的に確認するためのツールです。可変フレームレートや特殊なtimestamp構造を含むすべての動画で、厳密なフレーム単位の抽出位置を保証するフォレンジックツールではありません。
- 圧縮されたFFmpeg assetの展開に `DecompressionStream` を使用します。現在のChrome、Edge、Firefox、Safariを推奨します。

## 依存ライブラリ

| 依存 | バージョン | ライセンス | 用途 |
| --- | ---: | --- | --- |
| FFmpeg WASM Builder `video-contact-sheet` profile | 1.3.0 | 生成FFmpeg core: LGPL-2.1-or-later | コンテナ解析、シーク、動画デコード、縮小、RGBコンタクトシート生成 |

Canvas合成、時刻表示、PNG/JPEG保存、動画選択時サムネイル、ズームビューア、スマホUI、保存ファイル名処理はアプリ側で実装しています。依存ライブラリと対応ソースの詳細は [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) を参照してください。

## ライセンス

Copyright © 2026 ttomohisa

アプリケーションソースは [MIT License](LICENSE) です。

生成される単一HTMLにはLGPL-2.1-or-laterで配布されるFFmpeg WebAssembly coreも含まれます。詳細は [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) を参照してください。
