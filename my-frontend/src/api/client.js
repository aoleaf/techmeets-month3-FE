import axios from 'axios'

// 「設定済みのaxios」を1つだけ作って、アプリ全体で使い回す。
// - 各コンポーネントで毎回 http://localhost/api を書かなくて済む
// - APIのURLを変えたくなったら、このファイル1か所を直せばよい
// - Accept: application/json を付けておくと、Laravelがバリデーション失敗のとき
//   HTMLへのリダイレクトではなく 422 + JSON を返してくれる（エラー表示に必要）
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost/api',
  headers: {
    Accept: 'application/json',
  },
})

export default api
