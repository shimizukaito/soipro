import { useState } from "react";

function App() {
  const [status, setStatus] = useState("");

  // 押されたボタンの種類をサーバーに送信
  const sendButton = async (type) => {
    setStatus("送信中...");
    try {
      const res = await fetch("http://localhost:3001/buttons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });
      const json = await res.json();
      setStatus(`"${type}" を記録しました！（id: ${json.id}）`);
    } catch (e) {
      setStatus("エラー: " + e.message);
    }
  };

  return (
    <div style={{ padding: 40, textAlign: "center" }}>
      <h1>サーバーに送信テスト</h1>
      <button onClick={() => sendButton("A")}>A ボタン</button>
      <button onClick={() => sendButton("B")}>B ボタン</button>
      <button onClick={() => sendButton("C")}>C ボタン</button>
      <p>{status}</p>
    </div>
  );
}

export default App;
