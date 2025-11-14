import React, { useState, useEffect } from "react";

function App() {
  const [user] = useState({ id: 1, username: "test" }); // テスト用ユーザー
  const [themes, setThemes] = useState([]);
  const [newTheme, setNewTheme] = useState({ title: "", content: "" });
  const API_URL = "http://localhost:3001";

  // 全テーマ取得（最新順）
  const fetchThemes = async () => {
    try {
      const res = await fetch(`${API_URL}/themes`);
      const data = await res.json();
      // 作成日時で降順ソート
      const sorted = data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setThemes(sorted);
    } catch (err) {
      console.error("Fetch failed:", err);
    }
  };

  const handleCreateTheme = async () => {
    if (!newTheme.title || !newTheme.content) return alert("タイトルと内容を入力してください");

    try {
      const res = await fetch(`${API_URL}/themes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...newTheme, userId: user.id }),
      });
      const data = await res.json();
      setThemes((prev) => [data, ...prev]); // 最新テーマを上に追加
      setNewTheme({ title: "", content: "" });
    } catch (err) {
      console.error("Create failed:", err);
    }
  };

  useEffect(() => { fetchThemes(); }, []);

  // ユーザー自身のテーマだけフィルタ
  const myThemes = themes.filter(t => t.userId === user.id);

  return (
    <div style={{ padding: 20 }}>
      <h2>こんにちは、{user.username} さん (テスト用)</h2>

      <h3>テーマ作成</h3>
      <input
        placeholder="タイトル"
        value={newTheme.title}
        onChange={(e) => setNewTheme({ ...newTheme, title: e.target.value })}
      /><br/>
      <textarea
        placeholder="内容"
        value={newTheme.content}
        onChange={(e) => setNewTheme({ ...newTheme, content: e.target.value })}
      ></textarea><br/>
      <button onClick={handleCreateTheme}>作成</button>

      <h3>あなたのテーマ一覧（最新順）</h3>
      {myThemes.length === 0 ? (
        <p>まだテーマがありません</p>
      ) : (
        myThemes.map((t) => (
          <div key={t.id} style={{ border: "1px solid #ccc", margin: 8, padding: 8 }}>
            <strong>{t.title}</strong> — {t.user?.username || "匿名"}<br/>
            <small>{new Date(t.createdAt).toLocaleString()}</small>
            <p>{t.content}</p>
          </div>
        ))
      )}
    </div>
  );
}

export default App;
