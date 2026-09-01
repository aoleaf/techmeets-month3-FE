# Week 10 実装ガイド（React + Laravel API）

自分の環境に合わせて具体化した手順書。上から順にやれば課題が終わる。
コードは**穴埋め**になっている。ヒントを読んで、分からない単語は検索して、自分で埋めること。

---

## 0. 今週やることを1枚で

Week 9 までは「Laravelが画面(Blade)まで作って返す」1本の世界だった。
Week 10 は**それを2つに割る**。

```
   これまで                       今週から
+---------------+       +---------------+        +---------------+
|   Laravel     |       |    React      |  HTTP  |   Laravel     |
| Controller    |       | (localhost:   | -----> | (localhost)   |
|   -> Blade    |       |   5173)       | <----- |  /api/posts   |
|  HTMLを返す    |       | 画面を作る     |  JSON  | JSONを返す     |
+---------------+       +---------------+        +---------------+
  ブラウザは                  別々のサーバー。だから
  完成品を受け取るだけ          「オリジンが違う」= CORS の問題が出る
```

分担が変わるだけ。**Laravelは画面を作らなくなり、データ(JSON)だけを返す係になる。**
Reactが「そのJSONを受け取って画面を組み立てる係」になる。

今週の登場人物と役割:

| 名前 | 何をするもの | どこ |
|---|---|---|
| `routes/api.php` | `/api/○○` というURLと担当コントローラの対応表 | Laravel |
| `Api/PostController` | DBから取ってきて返すだけ（Bladeを返さない） | Laravel |
| `PostResource` | 「フロントに見せるフィールド」の定義。DBの列をそのまま漏らさないための壁 | Laravel |
| `config/cors.php` | 「どのフロントのURLからのアクセスを許すか」 | Laravel |
| `axios` | ReactからHTTPリクエストを出すライブラリ | React |
| `useState` | 変化するデータの入れ物。変えると画面が自動で描き直る | React |
| `useEffect` | 「画面が出た直後に1回だけ通信する」ためのフック | React |
| props | 親から子へデータを渡す仕組み（PHPの関数の引数と同じ発想） | React |

**今回APIにする対象は `Post`（投稿）**。理由は、Week 9 の要件どおり
`PostService`（Service層）と `Post -> belongsTo(User)`（リレーション）が既に実装済みだから。

---

## 1. バックエンド（`laravel-docker-app` リポジトリ）

### 1-1. まずコンテナを起動

```bash
cd c:/Users/aoba2/techmeet/A/laravel-docker-app
docker compose up -d
```

以降 `php artisan ○○` は**コンテナの中**で動かす:

```bash
docker compose exec app php artisan <コマンド>
```

> 自分の環境は nginx が 80番なので、APIのURLは **`http://localhost/api/posts`** になる。
> 教材の `http://localhost:8000` は `php artisan serve` を使う人向けなので、そのまま真似しない。

### 1-2. `routes/api.php` を使えるようにする

Laravel 11 以降、`routes/api.php` は**最初から存在しない**。自分で有効化する必要がある。
（`bootstrap/app.php` を見ると `web:` と `console:` しか登録されていないのが確認できる）

```bash
docker compose exec app php artisan install:api
```

このコマンドがやること:

1. `routes/api.php` を作る
2. `bootstrap/app.php` の `withRouting()` に `api: __DIR__.'/../routes/api.php'` を追記する
3. ついでに Laravel Sanctum（APIトークン認証）を入れる

途中で「migrationを実行するか？」と聞かれる。今週は認証を使わないので **No でよい**。

> 何が起きたか確かめる: `git diff bootstrap/app.php` で `api:` の行が増えているのを見ること。
> 「コマンドが勝手にやってくれた」で終わらせず、**何が追加されたのか**を目で見ておく。

### 1-3. APIリソースクラスを作る

```bash
docker compose exec app php artisan make:resource PostResource
```

`app/Http/Resources/PostResource.php` を次のように埋める。

```php
<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class PostResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id'    => $this->id,
            'title' => $this->title,

            // TODO BE-(1): content と category を同じ形で追加する

            // リレーション経由で著者名を出す。Post は belongsTo(User) を持っている。
            // PostRepository::paginateLatest() が Post::with('user') で先読みしているので
            // 一覧でも N+1 にならない。
            'author' => $this->user?->name,

            // created_at は Carbon なので好きな形に整形できる
            'created_at' => $this->created_at->format('Y-m-d'),
        ];
    }
}
```

**なぜこれを挟むのか**: `return $post;` だとDBの全カラムがそのままJSONになる。
将来 `password_hash` のような列が増えたときに気づかず外へ漏れる。
「フロントに出す項目はここに書いたものだけ」と**明示的に決める**のがResourceの役目。

### 1-4. APIコントローラを作る

```bash
docker compose exec app php artisan make:controller Api/PostController
```

`app/Http/Controllers/Api/PostController.php`:

```php
<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\PostRequest;
use App\Http\Resources\PostResource;
use App\Models\Post;
use App\Models\User;
use App\Services\PostService;

class PostController extends Controller
{
    // Week 9 で作った Service をそのまま使い回す。
    // 「HTTPの入口が Blade から JSON に変わっただけ」で、業務ロジックは共通。
    public function __construct(private PostService $postService) {}

    public function index()
    {
        $posts = $this->postService->list();

        // collection() は「複数件用」。data キーで包んだ配列を返す。
        return PostResource::collection($posts);
    }

    public function show(Post $post)
    {
        // TODO BE-(2): 1件を返す。
        //   ヒント: 複数件が PostResource::collection($posts) なら、1件は？
        //   ルートモデルバインディングにより $post には既に該当レコードが入っている。
    }

    public function store(PostRequest $request)
    {
        // 本来はログイン中のユーザーを使う。SPAの認証(Sanctum)は今週のスコープ外なので
        // 暫定的に「最初のユーザー」を作者にする。README にその旨を書いておくこと。
        $user = User::query()->oldest('id')->firstOrFail();

        // TODO BE-(3): PostService の createFor を使って保存し、
        //   PostResource に包んで、ステータスコード 201 で返す。
        //   ヒント: $request->validated() で検証済みの配列が取れる
        //   ヒント: return (new PostResource($post))->response()->setStatusCode(201);
    }
}
```

ポイント2つ:

- **`PostRequest` をそのまま使い回せる**。Bladeのフォームから来ようとReactから来ようと
  「タイトルは必須・200文字以内」というルールは同じだから。
  リクエストに `Accept: application/json` が付いていれば、検証に失敗したとき
  Laravelはリダイレクトではなく **422 + エラーのJSON** を返す（フロント側で設定済み）。
- **Serviceを呼ぶだけ**。コントローラにロジックを書かないのは Week 9 と同じ。

### 1-5. `routes/api.php` を書く

```php
<?php

use App\Http\Controllers\Api\PostController;
use Illuminate\Support\Facades\Route;

// ここに書いたルートは自動で /api が先頭に付き、CSRFトークンのチェックが免除される。
// （別オリジンのReactからはCSRFトークンを取れないので、これが重要）
Route::get('/posts', [PostController::class, 'index']);

// TODO BE-(4): 下の2つを追加する
//   GET  /posts/{post} -> show
//   POST /posts        -> store
```

書けたら確認:

```bash
docker compose exec app php artisan route:list --path=api
```

`GET api/posts` などが出ればOK。**出てこないなら 1-2 の登録ができていない。**

### 1-6. CORS を設定する

Laravel 11 以降は `config/cors.php` も**最初から存在しない**（デフォルト設定が内部にあるだけ）。
課題の要件なので、ファイルを取り出して明示的に設定する:

```bash
docker compose exec app php artisan config:publish cors
```

`config/cors.php` ができるので `allowed_origins` を直す:

```php
'allowed_origins' => [
    'http://localhost:5173',   // Vite の開発サーバー
],
```

その後 **必ず**:

```bash
docker compose exec app php artisan config:clear
```

**CORSとは何か（自分の言葉で説明できるようにする）**

- ブラウザには「今開いているページと違うオリジンへの通信を、勝手にはさせない」ルールがある。
  オリジン = **スキーム + ホスト + ポート**。`http://localhost:5173` と `http://localhost` は
  ポートが違うので**別オリジン**。
- これは**ブラウザ側の制限**であって、Laravel側の制限ではない。
  だから Postman や `curl` では成功するのにブラウザだけ失敗する、ということが起きる。
- 解決方法は「サーバーが `Access-Control-Allow-Origin: http://localhost:5173` という
  ヘッダーを返して、**ブラウザに許可を伝える**」こと。`config/cors.php` はそのヘッダーの設定。

### 1-7. ブラウザで確認

`http://localhost/api/posts` を直接開く。こういうJSONが出れば成功:

```json
{
  "data": [
    { "id": 1, "title": "...", "content": "...", "category": "技術", "author": "山田", "created_at": "2026-08-08" }
  ],
  "links": { "first": "...", "last": "...", "prev": null, "next": null },
  "meta": { "current_page": 1, "total": 3 }
}
```

> `links` / `meta` は `paginate()` を使っているから付く。
> **投稿の配列は `data` の中**。この形をよく見ておくこと。フロントの TODO (2) で必要になる。

データが空なら投稿を作っておく（`php artisan db:seed` や画面から投稿）。

---

## 2. フロントエンド（このリポジトリ）

`my-frontend/` に骨組みは作ってある。axios もインストール済み。

```
my-frontend/src/
├── api/client.js            <- 完成済み。axiosの設定を1か所にまとめたもの
├── App.jsx                  <- 【穴埋め (1)(2)(3)】データを取ってくる係
└── components/
    ├── PostForm.jsx         <- 【穴埋め (4)(5)(6)】新規登録フォーム
    ├── PostList.jsx         <- 完成見本。一覧の並べ方と状態の出し分け
    └── PostCard.jsx         <- 完成見本。1件分の表示
```

**進め方: まず完成見本の `PostCard.jsx` → `PostList.jsx` を読む。**
コメントに「なぜこう書くか」を書いてある。読んでから App.jsx の穴埋めに入ると分かりやすい。

### 2-1. 起動

```bash
cd c:/Users/aoba2/techmeet/A/techmeets-month3-FE/my-frontend
npm run dev
```

`http://localhost:5173` を開く。穴埋め前の状態では「投稿がまだありません。」と出る（正常）。

APIのURLは `my-frontend/.env` の `VITE_API_BASE_URL` で決めている。
`.env` を変えたら **`npm run dev` を再起動**しないと反映されない。

### 2-2. 穴埋め (1)(2)(3)（`src/App.jsx`）— 一覧表示【基本課題】

ファイル内の `TODO ①` `TODO ②` `TODO ③` を埋める。

つまずきやすい所:

- **`await` の付け忘れ** … `api.get()` は「通信が終わったら結果をくれる約束(Promise)」を返す。
  `await` を付けないと、結果ではなく約束そのものが変数に入る。
- **`response.data.data`** … `.data` が2回出てくるのが気持ち悪いが、意味が違う。
  1つ目はaxiosが付けるレスポンスボディ、2つ目はLaravelのResourceが包む `data` キー。
- **`useEffect` の第2引数 `[]`** … これを書かないと、描画 → 通信 → state更新 → 再描画 →
  通信 … の無限ループになる。ネットワークタブがリクエストで埋まったらこれを疑う。

うまくいけばブラウザに投稿が並ぶ。**ここまでで基本課題は完了。**

### 2-3. 穴埋め (4)(5)(6)（`src/components/PostForm.jsx`）— 登録【練習課題1】

`TODO ④⑤⑥` を埋める。JSX（見た目）は書いてあるので、中の処理だけ。

- **(4) が一番大事**。`form.title = value` のように直接書き換えても画面は変わらない。
  Reactは「新しいオブジェクトに差し替わったか」で再描画を判断するので、
  `setForm({ ...form, [name]: value })` のように**新しいオブジェクトを作って**渡す。
- **(6) の `onCreated()`** … これを呼ぶと App の `fetchPosts()` が走って一覧が最新になる。
  「保存後に一覧を再取得して画面に反映する」という要件はこれで満たす。

わざと空欄で送信して、赤いエラー文（Laravelの422レスポンス）が出ることも確認すること。

### 2-4. README を書く【練習課題2】

リポジトリ直下の `README.md` に見出しだけ用意してある。
特に「コンポーネント分割の理由」は**自分の言葉で**書くこと。考える材料:

- なぜ `PostCard` は自分でAPIを呼ばないのか？（呼ばないと何が嬉しいか）
- なぜ `posts` の state を `PostList` ではなく `App` が持っているのか？
  → フォームで登録したら一覧も変わる。**2つの兄弟が同じデータを見る**から、
  共通の親まで持ち上げた（React用語で lifting state up）。
- 逆に「入力中の文字」は `PostForm` だけが持っている。なぜ App に上げなくてよいのか？
  → 他の誰も必要としないから。**必要とする人がいない state は上げない**。

---

## 3. 詰まったときのチェックリスト

| 症状 | 原因 | 対処 |
|---|---|---|
| `blocked by CORS policy` | `allowed_origins` に `http://localhost:5173` がない / `config:clear` していない | 1-6 をやり直す |
| 404 Not Found | `routes/api.php` が登録されていない | `php artisan route:list --path=api` で確認。1-2 へ |
| `posts.map is not a function` | `setPosts` に配列以外を入れた（`response.data` のままなど） | ブラウザで `/api/posts` を開き、配列がどこにあるか確認 |
| 画面が真っ白 | JSのエラー | F12 → Console を見る。エラーの1行目を読む |
| フォーム送信で画面がリロードされる | `e.preventDefault()` がない | `handleSubmit` の先頭を確認 |
| 通信が止まらない | `useEffect` の `[]` 忘れ | 2-2 参照 |
| 422 が返る | バリデーションエラー | Networkタブでレスポンスの `errors` を見る |

**エラーの調べ方**: F12 の **Network タブ**でリクエストを1件クリックし、
Status / Response / Request Headers を見る。「どこまで届いていて、何が返ってきたか」が分かる。
AIに聞くときも、この情報を添えると精度が上がる。

> AIの使い方（課題文より）: CORSエラーが出たらメッセージを貼って**「なぜこれが起きるのか」を説明させる**。
> 直し方だけコピペしない。1-6 の説明を自分の言葉で言い直せるかで確認すること。

---

## 4. 提出物

- [ ] GitHub リポジトリURL 2つ（`techmeets-month3-FE` と `laravel-docker-app`）
- [ ] `README.md` に「動かし方」「コンポーネント分割の理由」
- [ ] ブラウザに投稿が並んでいるスクリーンショット
- [ ] （あれば）フォームから登録できているスクリーンショット

## 5. 提出前の自己チェック

コードが動くことより、**説明できること**が大事。以下に自分の言葉で答えられるか:

1. `routes/web.php` と `routes/api.php` の違いは？
2. `PostResource` を挟まないと何が困る？
3. CORSエラーは誰が出しているエラー？（Laravel？ ブラウザ？）
4. `useState` の setter を呼ぶと何が起きる？
5. `props` はどっち向きに流れる？（親→子 / 子→親）
6. 子から親に「登録できたよ」と伝えるにはどうした？（`PostForm` の `onCreated`）
