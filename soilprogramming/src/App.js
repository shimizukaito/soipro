// src/App.js
import { useLayoutEffect, useRef, useState } from "react";

/** 入力に合わせて高さが伸びるTextarea（1行から開始） */
function AutoResizeTextarea({ value, onChange, placeholder, minRows = 1, style, mono = false }) {
  const ref = useRef(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  const baseStyle = {
    width: "100%",
    overflow: "hidden",
    resize: "none",
    border: "1px solid #ccc",
    borderRadius: 4,
    padding: 8,
    fontSize: 14,
    lineHeight: 1.5,
    boxSizing: "border-box",
    ...(mono ? { fontFamily: "monospace", background: "#f5f5f5" } : {}),
    ...style,
  };

  return (
    <textarea
      ref={ref}
      rows={minRows}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={baseStyle}
    />
  );
}

export default function App() {
  const [blocks, setBlocks] = useState([]);

  // 追加ボタン（固定ヘッダー用の共通スタイル）
  const buttonStyle = {
    border: "none",
    background: "transparent",
    padding: "8px 14px",
    borderRadius: 6,
    cursor: "pointer",
    fontSize: "15px",
    marginRight: "8px",
    transition: "background 0.2s ease",
  };

  // サーバへ保存（Post）
  async function saveToDatabase(block) {
    try {
      await fetch("http://localhost:3001/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: block.content,
          output: block.type === "code" ? block.output ?? "" : "",
          theme: 1,     // 仮テーマ（整数）
          user: "pro助", // 仮ユーザー
        }),
      });
    } catch (err) {
      console.error("DB保存エラー:", err);
      alert("DB保存に失敗しました");
    }
  }

  // ブロック追加
  const addBlock = (type) => {
    const newBlock = {
      id: Date.now(),
      type,       // "code" | "text"
      content: "",
      output: "", // 実行結果（textは空）
    };
    setBlocks((prev) => [...prev, newBlock]);
  };

  // 内容更新
  const updateBlock = (id, newContent) => {
    setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, content: newContent } : b)));
  };

  // コード実行（実行時に自動保存も行う）
  const runCode = async (id) => {
    let updatedBlock;
    setBlocks((prev) =>
      prev.map((b) => {
        if (b.id !== id) return b;
        try {
          const result = eval(b.content); // 簡易：eval（将来はsandbox/workerへ）
          updatedBlock = { ...b, output: String(result ?? "") };
          return updatedBlock;
        } catch (err) {
          updatedBlock = { ...b, output: "⚠️ エラー: " + err.message };
          return updatedBlock;
        }
      })
    );
    // state更新が終わるのを待たずに、直近のupdatedBlockを保存（内容/出力を送る）
    if (updatedBlock) await saveToDatabase(updatedBlock);
  };

  // テキストブロック明示保存用
  const saveTextBlock = async (id) => {
    const target = blocks.find((b) => b.id === id);
    if (target) {
      await saveToDatabase({ ...target, output: "" }); // textは出力空
      alert("保存しました");
    }
  };

  // ブロック削除（おまけ）
  const removeBlock = (id) => {
    setBlocks((prev) => prev.filter((b) => b.id !== id));
  };

  return (
    <div style={{ fontFamily: "sans-serif" }}>
      {/* 固定ヘッダー（追加ボタン） */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          background: "white",
          borderBottom: "1px solid #ddd",
          padding: "10px 24px",
          zIndex: 1000,
        }}
      >
        <button
          onClick={() => addBlock("code")}
          style={buttonStyle}
          onMouseOver={(e) => (e.currentTarget.style.background = "#eee")}
          onMouseOut={(e) => (e.currentTarget.style.background = "transparent")}
        >
          ＋ コード
        </button>
        <button
          onClick={() => addBlock("text")}
          style={buttonStyle}
          onMouseOver={(e) => (e.currentTarget.style.background = "#eee")}
          onMouseOut={(e) => (e.currentTarget.style.background = "transparent")}
        >
          ＋ テキスト
        </button>
      </div>

      {/* ブロックコンテンツ */}
      <div
        style={{
          marginTop: 80, // ヘッダー分の余白
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        {blocks.map((block) => (
          <div
            key={block.id}
            style={{
              width: "80%",
              maxWidth: 900,
              border: "1px solid #ddd",
              borderRadius: 6,
              padding: "8px 10px",
              marginBottom: 16,
              backgroundColor: block.type === "code" ? "#f8f8f8" : "white",
              boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
              transition: "box-shadow 0.2s ease",
            }}
          >
            {/* ブロック上部の操作行（右上に削除/保存） */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginBottom: 8 }}>
              {block.type === "text" && (
                <button
                  onClick={() => saveTextBlock(block.id)}
                  style={{
                    border: "1px solid #ddd",
                    background: "white",
                    borderRadius: 6,
                    padding: "4px 8px",
                    cursor: "pointer",
                  }}
                  title="このテキストをDBへ保存"
                >
                  💾 保存
                </button>
              )}
              <button
                onClick={() => removeBlock(block.id)}
                style={{
                  border: "1px solid #ddd",
                  background: "white",
                  borderRadius: 6,
                  padding: "4px 8px",
                  cursor: "pointer",
                }}
                title="このブロックを削除"
              >
                🗑 削除
              </button>
            </div>

            {block.type === "code" ? (
              <>
                {/* コード入力＆実行 */}
                <div style={{ display: "flex", alignItems: "flex-start" }}>
                  {/* 丸い実行ボタン（YouTube再生風） */}
                  <button
                    onClick={() => runCode(block.id)}
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: "50%",
                      background: "#4CAF50",
                      border: "none",
                      color: "white",
                      fontSize: 18,
                      cursor: "pointer",
                      marginRight: 10,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                    title="実行（実行後にDB保存）"
                    aria-label="実行"
                  >
                    ▶
                  </button>

                  {/* コードエリア（1行から伸びる） */}
                  <AutoResizeTextarea
                    value={block.content}
                    onChange={(v) => updateBlock(block.id, v)}
                    placeholder="// JavaScriptコードを書いてください"
                    minRows={1}
                    mono
                  />
                </div>

                {/* 実行結果（コードと幅を揃える） */}
                {block.output && (
                  <div
                    style={{
                      background: "#fff",
                      border: "1px solid #ccc",
                      borderRadius: 4,
                      padding: 8,
                      marginTop: 8,
                      fontFamily: "monospace",
                      whiteSpace: "pre-wrap",
                      width: "calc(100% - 48px)", // 実行ボタンぶんを差し引く
                      marginLeft: 48,             // ボタンと揃える
                    }}
                  >
                    {block.output}
                  </div>
                )}
              </>
            ) : (
              // テキストブロック（1行から伸びる）
              <AutoResizeTextarea
                value={block.content}
                onChange={(v) => updateBlock(block.id, v)}
                placeholder="ここにテキストを書く..."
                minRows={1}
                style={{ fontSize: 15 }}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
