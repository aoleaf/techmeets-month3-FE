import { useState, useEffect } from 'react'
import api from './api/client'
import PostList from './components/PostList'
import PostForm from './components/PostForm'
import './App.css'

// ===== 穴埋め① データを取ってくる係（App） =====
//
// なぜ App が通信を持つのか:
//   一覧（PostList）とフォーム（PostForm）の両方が「投稿の配列」に関係する。
//   フォームで登録したら一覧も更新したい ＝ 2つの兄弟コンポーネントが同じデータを見る。
//   Reactではこういうとき、共通の親までstateを持ち上げる（lifting state up）。
//
// TODO は ①②③ の3か所。完成見本の PostList.jsx / PostCard.jsx を見ながら進めてOK。
function App() {
  // useState = 「変化するデータ」の入れ物。
  // [今の値, 値を変える関数] の形で返ってくる。setterを呼ぶと画面が自動で描き直される。
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // 一覧を取り直す処理。「初回表示」と「投稿の登録後」の2回使いたいので関数に切り出す。
  async function fetchPosts() {
    setLoading(true)
    setError('')

    try {
      // ------------------------------------------------------------------
      // TODO ①: api を使って GET /posts を呼び、その結果を response に入れる
      //   ヒント: await api.get('/posts')
      //   client.js の baseURL と連結されて http://localhost/api/posts になる。
      //   await = 「通信が終わるまでここで待つ」。await を付け忘れると
      //   Promiseオブジェクトがそのまま入ってしまうので注意。
      // ------------------------------------------------------------------
      const response = await api.get('/posts')
      // ------------------------------------------------------------------
      // TODO ②: 取得した配列を posts state に入れる
      //   ヒント: response.data      … axiosが付けるレスポンスボディ全体
      //           response.data.data … LaravelのAPIリソースが包む "data" キーの中身
      //   ブラウザで直接 http://localhost/api/posts を開いて、
      //   どんな形のJSONが返ってきているか自分の目で確認してから書くこと。
      // ------------------------------------------------------------------
      setPosts(response.data.data) 
    } catch (e) {
      // ここに来る＝通信そのものが失敗した（CORS / サーバー停止 / 404 など）
      console.error('取得失敗:', e)
      setError('データの取得に失敗しました。Laravelが起動しているか、CORS設定を確認してください。')
    } finally {
      // 成功しても失敗しても必ず通る。読み込み中の表示を必ず解除するため。
      setLoading(false)
    }
  }

  // ------------------------------------------------------------------
  // TODO ③: 画面が最初に表示されたときに一度だけ fetchPosts() を実行する
  //   ヒント: useEffect の中で fetchPosts() を呼ぶ。
  //   第2引数の [] は「依存する値なし＝初回マウント時だけ実行」の意味。
  //   [] を書き忘れると、再描画のたびに通信 → state更新 → 再描画… の無限ループになる。
  // ------------------------------------------------------------------
  useEffect(() => {
    fetchPosts() 
  }, [])

  return (
    <main className="app">
      <header className="app-header">
        <h1>投稿一覧</h1>
      </header>

      {/* 登録が成功したら onCreated が呼ばれる → 一覧を取り直す */}
      <PostForm onCreated={fetchPosts} />

      {/* 表示に必要なものだけを props で渡す */}
      <PostList posts={posts} loading={loading} error={error} />
    </main>
  )
}

export default App
