// ===== 完成見本① 「1件分」を表示するだけのコンポーネント =====
//
// ポイント: このコンポーネントは自分でAPIを呼ばない。
// 親から props（= post）を受け取って表示するだけ。
// 「表示だけ」に責任を絞ると、一覧でも詳細でも検索結果でも使い回せる。
//
// { post } は「引数オブジェクトの post プロパティだけ取り出す」書き方（分割代入）。
// function PostCard(props) { ... props.post ... } と同じ意味。
function PostCard({ post }) {
  return (
    <article className="card">
      <h3 className="card-title">{post.title}</h3>
      <p className="card-meta">
        <span className="badge">{post.category}</span>
        <span>{post.author}</span>
        <span>{post.created_at}</span>
      </p>
      <p className="card-body">{post.content}</p>
    </article>
  )
}

export default PostCard
