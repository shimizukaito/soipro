import { useLayoutEffect, useRef, useState, useEffect } from "react";

/** ================================
 *  ヘルパー：CSVユーティリティ
 * ================================ */
function csvEscape(v) {
  const s = String(v ?? "").replaceAll('"', '""').replaceAll("\n", "\\n");
  return `"${s}"`;
}
function postToCSV(post) {
  const headers = ["id", "order", "theme", "user", "createdAt", "content"];
  const row = [
    post.id,
    post.order,
    post.theme,
    post.user,
    new Date(post.createdAt).toISOString(),
    typeof post.content === "string"
      ? post.content
      : JSON.stringify(post.content),
  ];
  return headers.join(",") + "\n" + row.map(csvEscape).join(",");
}

/** ================================
 *  ヘルパー：トップレベルawait可の評価器
 * ================================ */
async function asyncEval(code, context = {}) {
  const argNames = Object.keys(context);
  const argValues = Object.values(context);
  const fn = new Function(
    ...argNames,
    `"use strict"; return (async () => { ${code} })();`
  );
  return await fn(...argValues);
}

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

  /** ================================
   * DB保存
   * ================================ */
  async function saveToDatabase(block) {
    try {
      const res = await fetch("http://localhost:3001/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: block.content,
          output: block.type === "code" ? block.output ?? "" : "",
          theme: 1,
          user: "pro助",
          order: block.order,
        }),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`DB保存に失敗しました: ${res.status} ${text}`);
      }
    } catch (err) {
      console.error("DB保存エラー:", err);
    }
  }

  async function getNextOrder(theme = 1) {
    const res = await fetch(
      `http://localhost:3001/posts/nextOrder?theme=${theme}`
    );
    if (!res.ok) throw new Error("次のorder取得に失敗しました。");
    const { nextOrder } = await res.json();
    return nextOrder;
  }

  /** ================================
   * 初期ロード
   * ================================ */
  useEffect(() => {
    async function fetchPosts() {
      try {
        const res = await fetch("http://localhost:3001/posts?theme=1");
        if (!res.ok) throw new Error("データ取得に失敗しました。");
        const posts = await res.json();
        const sorted = posts.sort((a, b) => a.order - b.order);
        const formatted = sorted.map((p) => ({
          id: p.id,
          type: p.output === "" ? "text" : "code",
          content: p.content,
          output: p.output,
          order: p.order,
        }));
        setBlocks(formatted);
      } catch (err) {
        console.error("データ取得エラー:", err);
      }
    }
    fetchPosts();
  }, []);

  /** ================================
   * ブロック追加
   * ================================ */
  const addBlock = async (type) => {
    try {
      const nextOrder = await getNextOrder(1);
      const newBlock = {
        id: Date.now(),
        type,
        content: "",
        output: "",
        order: nextOrder,
      };
      setBlocks((prev) => [...prev, newBlock]);
    } catch (err) {
      console.error(err);
      alert("ブロックの追加に失敗しました。");
    }
  };

  /** ================================
   * 入力更新
   * ================================ */
  const updateBlock = (id, newContent) => {
    setBlocks((prev) =>
      prev.map((b) => (b.id === id ? { ...b, content: newContent } : b))
    );
  };

  /** ================================
   * コード実行
   * ================================ */
  const runCode = async (id) => {
    const block = blocks.find((b) => b.id === id);
    if (!block) return;

    setBlocks((prev) =>
      prev.map((b) => (b.id === id ? { ...b, __running: true } : b))
    );

    let outputText = "";

    const print = (...args) => {
      outputText += (outputText ? "\n" : "") + args.map(String).join(" ");
    };

    const context = {
      getPost: async (n) => {
        const res = await fetch(
          `http://localhost:3001/posts/history?n=${n}&theme=1`
        );
        if (!res.ok) throw new Error("履歴の取得に失敗しました。");
        return await res.json();
      },
      toCSV: (post) => postToCSV(post),
      print,
    };

    try {
      const result = await asyncEval(block.content.trim(), context);
      if (result !== undefined) {
        outputText += (outputText ? "\n" : "") + String(result);
      }
    } catch (err) {
      outputText = "⚠️ エラー: " + err.message;
    }

    const updated = { ...block, output: outputText, __running: false };

    try {
      await saveToDatabase(updated);
    } catch {}

    setBlocks((prev) => prev.map((b) => (b.id === id ? updated : b)));
  };

  /** ================================
   * テキスト自動保存
   * ================================ */
  const handleBlur = async (id) => {
    const block = blocks.find((b) => b.id === id);
    if (!block || block.content.trim() === "") return;
    try {
      await saveToDatabase({ ...block, output: "" });
    } catch {}
  };

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

  const indexLabelStyle = {
    flex: "0 0 40px",
    textAlign: "right",
    marginRight: 8,
    color: "#888",
    fontFamily: "monospace",
    paddingTop: 6,
  };

  /** ================================
   * UI
   * ================================ */
  return (
    <div style={{ fontFamily: "sans-serif" }}>
      {/* 固定ヘッダー：作業コンテキスト + ブロック追加ボタン */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          background: "white",
          borderBottom: "1px solid #ddd",
          padding: "10px 24px 14px",
          zIndex: 1000,
          boxSizing: "border-box",
        }}
      >
        {/* 作業コンテキスト（ボタンの上） */}
        <div style={{ marginBottom: 10 }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>テーマの名前
          </h2>
          <p style={{ margin: "4px 0 0 0", color: "#666", fontSize: 13 }}>
            ユーザー：pro助 / テーマID：1
          </p>
          {/* 必要に応じてテーマ名・説明・日付などをここに追加 */}
        </div>

        {/* ボタン行 */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            onClick={() => addBlock("code")}
            style={buttonStyle}
            onMouseOver={(e) => (e.currentTarget.style.background = "#eee")}
            onMouseOut={(e) =>
              (e.currentTarget.style.background = "transparent")
            }
          >
            ＋ コード
          </button>
          <button
            onClick={() => addBlock("text")}
            style={buttonStyle}
            onMouseOver={(e) => (e.currentTarget.style.background = "#eee")}
            onMouseOut={(e) =>
              (e.currentTarget.style.background = "transparent")
            }
          >
            ＋ テキスト
          </button>
        </div>
      </div>

      {/* メイン表示：ヘッダー高さぶん下げる */}
      <div
        style={{
          marginTop: 140, // ヘッダー（コンテキスト＋ボタン）分の高さに合わせて調整
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        {blocks.map((block, index) => (
          // 外側ラッパー：番号 + カードを横並び
          <div
            key={block.id}
            style={{
              width: "80%",
              maxWidth: 900,
              display: "flex",
              marginBottom: 16,
            }}
          >
            {/* 添字番号（カードの“外側左”） */}
            <div style={indexLabelStyle}>[{index + 1}]</div>

            {/* カード本体（枠付き） */}
            <div
              style={{
                flex: 1,
                border: "1px solid #ddd",
                borderRadius: 6,
                padding: "8px 10px",
                backgroundColor: block.type === "code" ? "#f8f8f8" : "white",
                boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
              }}
            >
              {block.type === "code" ? (
                <>
                  <div style={{ display: "flex", alignItems: "flex-start" }}>
                    {/* ▶ 実行ボタン */}
                    <button
                      onClick={() => runCode(block.id)}
                      disabled={!!block.__running}
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: "50%",
                        background: block.__running ? "#9E9E9E" : "#4CAF50",
                        border: "none",
                        color: "white",
                        fontSize: 18,
                        cursor: block.__running
                          ? "not-allowed"
                          : "pointer",
                        marginRight: 10,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                      title={block.__running ? "実行中..." : "実行"}
                    >
                      ▶
                    </button>

                    {/* コード入力 */}
                    <AutoResizeTextarea
                      value={block.content}
                      onChange={(v) => updateBlock(block.id, v)}
                      placeholder={`// 例:\n// const p = await getPost(2);\n// print(toCSV(p));\n// return p.content;`}
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
                        whiteSpace: "pre",
                      }}
                    >
                      {block.output}
                    </div>
                  )}
                </>
              ) : (
                // テキストブロック
                <AutoResizeTextarea
                  value={block.content}
                  onChange={(v) => updateBlock(block.id, v)}
                  onBlur={() => handleBlur(block.id)}
                  placeholder="ここにテキストを書く..."
                  minRows={1}
                  style={{ fontSize: 15 }}
                />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
