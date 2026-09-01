import { useState } from 'react'
import api from '../api/client'

// LaravelのPostRequestは category を「必須の文字列」としか見ていないので、
// フロント側で選択肢を決め打ちにしておく。自由入力にしたければ input に変えてよい。
const CATEGORIES = ['お知らせ', '技術', '日記', 'その他']

// ===== 穴埋め② 新規登録フォーム =====
//
// このコンポーネントの責任は「入力を受け取ってPOSTする」ことだけ。
// 登録後に一覧をどう更新するかは知らない。成功したら onCreated() を呼んで親に任せる。
// → 一覧の持ち方が変わってもこのファイルは直さなくて済む（＝再利用しやすい）。
//
// TODO は ④⑤⑥ の3か所。JSXは書いてあるので、中の処理だけ埋める。
function PostForm({ onCreated }) {
  // 入力値もstate。項目が3つあるので1つのオブジェクトにまとめて持つ。
  const [form, setForm] = useState({ title: '', content: '', category: CATEGORIES[0] })
  const [submitting, setSubmitting] = useState(false)
  // Laravelのバリデーションエラー。{ title: ['タイトルは必須です'], ... } という形。
  const [errors, setErrors] = useState({})

  // input が1文字変わるたびに呼ばれる。
  // e.target.name  = input の name 属性（'title' / 'content' / 'category'）
  // e.target.value = 入力された文字
  function handleChange(e) {
    const { name, value } = e.target

    // ------------------------------------------------------------------
    // TODO ④: name の項目だけを value に差し替えた「新しいオブジェクト」を setForm する
    //   ヒント: setForm({ ...form, [name]: value })
    //   ・ ...form  … 今の form の中身をコピーするスプレッド構文
    //   ・ [name]   … 変数の中身をキー名として使う書き方（計算されたプロパティ名）
    //   ・ form.title = value のように直接書き換えてはいけない。
    //     Reactは「別のオブジェクトに変わった」ことで再描画を判断するため、
    //     中身を書き換えるだけでは画面が更新されない。
    // ------------------------------------------------------------------
    setForm({ ...form, [name]: value })
  }

  async function handleSubmit(e) {
    e.preventDefault() // HTML標準の送信（ページ再読み込み）を止める。これがないと画面が真っ白に戻る
    setSubmitting(true)
    setErrors({})

    try {
      // ------------------------------------------------------------------
      // TODO ⑤: POST /posts に form の中身を送る
      //   ヒント: await api.post('/posts', form)
      //   第2引数のオブジェクトが、そのままJSONのリクエストボディになる。
      // ------------------------------------------------------------------
      await api.post('/posts', form)

      // ------------------------------------------------------------------
      // TODO ⑥: 送信に成功したら
      //   (a) フォームを空に戻す（setForm で初期値と同じオブジェクトを入れる）
      //   (b) onCreated() を呼んで、親に「登録できたよ」と伝える
      //   ※ (b) を呼ぶと App の fetchPosts() が走って一覧が最新になる
      // ------------------------------------------------------------------
      setForm({ title: '', content: '', category: CATEGORIES[0] })
      onCreated()
    } catch (err) {
      // 422 = バリデーションエラー。Laravelが「どの項目がなぜダメか」を返してくれる
      if (err.response?.status === 422) {
        setErrors(err.response.data.errors)
      } else {
        console.error('登録失敗:', err)
        alert('登録に失敗しました。コンソールを確認してください。')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className="form" onSubmit={handleSubmit}>
      <h2>新規投稿</h2>

      <label className="field">
        <span>タイトル</span>
        {/* value と onChange をセットで書くのがReactの基本形（制御コンポーネント）。
            value だけだと入力できず、onChange だけだとstateと表示がズレる。 */}
        <input
          name="title"
          value={form.title}
          onChange={handleChange}
          placeholder="タイトル"
        />
        {errors.title && <em className="field-error">{errors.title[0]}</em>}
      </label>

      <label className="field">
        <span>カテゴリー</span>
        <select name="category" value={form.category} onChange={handleChange}>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        {errors.category && <em className="field-error">{errors.category[0]}</em>}
      </label>

      <label className="field">
        <span>本文</span>
        <textarea
          name="content"
          rows="4"
          value={form.content}
          onChange={handleChange}
          placeholder="本文"
        />
        {errors.content && <em className="field-error">{errors.content[0]}</em>}
      </label>

      <button type="submit" disabled={submitting}>
        {submitting ? '送信中...' : '登録する'}
      </button>
    </form>
  )
}

export default PostForm
