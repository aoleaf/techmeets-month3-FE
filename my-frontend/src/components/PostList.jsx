import PostCard from './PostCard'

// ===== 完成見本② 「並べ方」と「状態の出し分け」を担当するコンポーネント =====
//
// ここも通信はしない。データは親（App）から props でもらう。
// 担当するのは次の2つだけ:
//   1. 読み込み中 / エラー / 0件 の出し分け
//   2. 配列を map で回して PostCard を人数分ならべる
//
// key={post.id} は必須。Reactが「どの行がどれか」を見分けるための目印で、
// 付け忘れると並び替えや削除のときに表示がズレる。配列のindexではなくDBのidを使う。
function PostList({ posts, loading, error }) {
  if (loading) return <p className="state">読み込み中...</p>
  if (error) return <p className="state state-error">{error}</p>
  if (posts.length === 0) return <p className="state">投稿がまだありません。</p>

  return (
    <div className="list">
      {posts.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}
    </div>
  )
}

export default PostList
