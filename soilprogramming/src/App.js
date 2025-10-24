import { useLayoutEffect, useRef, useState, useEffect } from "react";

/** 自動で高さが伸びるTextarea */
function AutoResizeTextarea({
  value,
  onChange,
  onBlur,
  placeholder,
  minRows = 1,
  style,
  mono = false,
}) {
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
      onBlur={onBlur}
      placeholder={placeholder}
      style={baseStyle}
    />
  );
}

export default function App() {
  const [blocks, setBlocks] = useState([]);

  /** DBへ新しいブロックを保存（既存orderは上書き扱い） */
  async function saveToDatabase(block) {
    try {
      await fetch("http://localhost:3001/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: block.content,
          output: block.type === "code" ? block.output ?? "" : "",
          theme: 1,
          user: "pro助",
          order: block.order, // ← ここで固定orderを送る
        }),
      });
    } catch (err) {
      console.error("DB保存エラー:", err);
    }
  }

  /** 初回ロード時：theme=1の最新データを取得 */
  useEffect(() => {
    async function fetchPosts() {
      try {
        const res = await fetch("http://localhost:3001/posts?theme=1");
        const posts = await res.json();

        // order順で並び替えて格納
        const sorted = posts.sort((a, b) => a.order - b.order);

        const formatted = sorted.map((p) => ({
          id: p.id,
          type: p.output === "" ? "text" : "code",
          content: p.content,
          output: p.output,
          order: p.order, // ← DBから取得したorderを保持
        }));

        setBlocks(formatted);
      } catch (err) {
        console.error("データ取得エラー:", err);
      }
    }

    fetchPosts();
  }, []);

  /** 新しいブロックを追加（orderを固定で決める） */
  const addBlock = (type) => {
    const newBlock = {
      id: Date.now(),
      type,
      content: "",
      output: "",
      order: blocks.length + 1, // ← 固定の順序番号
    };
    setBlocks((prev) => [...prev, newBlock]);
  };

  /** 入力変更（stateのみ変更） */
  const updateBlock = (id, newContent) => {
    setBlocks((prev) =>
      prev.map((b) => (b.id === id ? { ...b, content: newContent } : b))
    );
  };

  /** コード実行（eval）＋DB保存 */
  const runCode = async (id) => {
    const block = blocks.find((b) => b.id === id);
    if (!block) return;

    let outputText = "";
    try {
      const result = eval(block.content);
      outputText = String(result ?? "");
    } catch (err) {
      outputText = "⚠️ エラー: " + err.message;
    }

    const updated = { ...block, output: outputText };
    await saveToDatabase(updated);

    setBlocks((prev) =>
      prev.map((b) => (b.id === id ? updated : b))
    );
  };

  /** テキストブロックの自動保存（フォーカスが外れた時） */
  const handleBlur = async (id) => {
    const block = blocks.find((b) => b.id === id);
    if (!block || block.content.trim() === "") return;
    await saveToDatabase({ ...block, output: "" });
  };

  /** ボタン共通スタイル */
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

  return (
    <div style={{ fontFamily: "sans-serif" }}>
      {/* 固定ヘッダー */}
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

      {/* ブロック本体 */}
      <div
        style={{
          marginTop: 80,
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
            }}
          >
            {block.type === "code" ? (
              <>
                {/* コード入力と実行ボタン */}
                <div style={{ display: "flex", alignItems: "flex-start" }}>
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
                    title="実行"
                  >
                    ▶
                  </button>

                  <AutoResizeTextarea
                    value={block.content}
                    onChange={(v) => updateBlock(block.id, v)}
                    placeholder="// JavaScriptコードを書いてください"
                    minRows={1}
                    mono
                  />
                </div>

                {/* 実行結果 */}
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
                      marginLeft: 46,
                      width: "calc(100% - 46px)",
                    }}
                  >
                    {block.output}
                  </div>
                )}
              </>
            ) : (
              <AutoResizeTextarea
                value={block.content}
                onChange={(v) => updateBlock(block.id, v)}
                onBlur={() => handleBlur(block.id)} // ← フォーカス外れたら保存
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
