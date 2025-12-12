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
    typeof post.content === "string" ? post.content : JSON.stringify(post.content),
  ];
  return headers.join(",") + "\n" + row.map(csvEscape).join(",");
}
function postsToCSV(posts) {
  const headers = ["id", "order", "theme", "user", "createdAt", "content"];
  const rows = posts.map((post) => {
    const row = [
      post.id,
      post.order,
      post.theme,
      post.user,
      new Date(post.createdAt).toISOString(),
      typeof post.content === "string" ? post.content : JSON.stringify(post.content),
    ];
    return row.map(csvEscape).join(",");
  });
  return [headers.join(","), ...rows].join("\n");
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
  readOnly = false,
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
      readOnly={readOnly}
      onChange={(e) => onChange?.(e.target.value)}
      onBlur={onBlur}
      placeholder={placeholder}
      style={baseStyle}
    />
  );
}

export default function App() {
  const API_BASE = "http://localhost:3001";

  const [blocks, setBlocks] = useState([]);

  const [themes, setThemes] = useState([]);
  const [currentTheme, setCurrentTheme] = useState(1); // 現在選択中テーマID

  // ✅ 教材 questions を保持（theme.sections から作る）
  const [questions, setQuestions] = useState([]);
  // ✅ 次に追加する question 番号
  const [nextQuestionNum, setNextQuestionNum] = useState(1);

  /** ================================
   * DB保存
   * ================================ */
  async function saveToDatabase(block) {
    try {
      const res = await fetch(`${API_BASE}/posts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: block.content,
          output: block.type === "code" ? block.output ?? "" : "",
          theme: currentTheme,
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

  async function getNextOrder(theme) {
    const res = await fetch(`${API_BASE}/posts/nextOrder?theme=${theme}`);
    if (!res.ok) throw new Error("次のorder取得に失敗しました。");
    const { nextOrder } = await res.json();
    return nextOrder;
  }

  /** ================================
   * テーマ一覧 初期ロード
   * ================================ */
  useEffect(() => {
    async function fetchThemes() {
      try {
        const res = await fetch(`${API_BASE}/themes`);
        if (!res.ok) throw new Error("テーマ一覧の取得に失敗しました。");
        const data = await res.json();
        setThemes(data);

        // currentTheme が存在しないときは先頭テーマ
        if (data.length > 0 && !data.find((t) => t.id === currentTheme)) {
          setCurrentTheme(data[0].id);
        }
      } catch (err) {
        console.error("テーマ一覧取得エラー:", err);
      }
    }
    fetchThemes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** ================================
   * 投稿ロード（テーマ切替時）
   * ================================ */
  useEffect(() => {
    async function fetchPosts() {
      try {
        const res = await fetch(`${API_BASE}/posts?theme=${currentTheme}`);
        if (!res.ok) throw new Error("データ取得に失敗しました。");
        const posts = await res.json();
        const sorted = posts.sort((a, b) => a.order - b.order);
        const formatted = sorted.map((p) => ({
          id: p.id,
          type: p.output === "" ? "text" : "code",
          content: p.content,
          output: p.output,
          order: p.order,
          theme: p.theme,
        }));
        setBlocks(formatted);
      } catch (err) {
        console.error("データ取得エラー:", err);
      }
    }
    fetchPosts();
  }, [currentTheme]);

  /** ================================
   * ✅ theme.sections から questions を読み込む
   * - sections が「質問配列そのもの」でもOK
   * - sections が { questions:[...] } の配列でもOK
   * ================================ */
  useEffect(() => {
    async function fetchQuestions() {
      try {
        const res = await fetch(`${API_BASE}/themes/${currentTheme}`);
        if (!res.ok) throw new Error("テーマ詳細の取得に失敗しました。");
        const theme = await res.json();

        const sections = theme.sections ?? [];

        // デバッグ（必要なら残してOK）
        console.log("theme.sections =", sections);

        const allQuestions = Array.isArray(sections)
          ? sections.flatMap((s) => {
              // sections が質問配列そのもの： {question,text,...}
              if (s && s.question !== undefined) return [s];
              // sections が { questions:[...] } の配列
              if (s && Array.isArray(s.questions)) return s.questions;
              return [];
            })
          : [];

        allQuestions.sort((a, b) => Number(a.question) - Number(b.question));

        setQuestions(allQuestions);
        setNextQuestionNum(1); // テーマ切替時は最初から（必要なら後で復元も可）
      } catch (err) {
        console.error("質問ロード失敗:", err);
        setQuestions([]);
        setNextQuestionNum(1);
      }
    }

    fetchQuestions();
  }, [currentTheme]);

  /** ================================
   * ブロック追加（手動）
   * ================================ */
  const addBlock = async (type) => {
    try {
      const nextOrder = await getNextOrder(currentTheme);
      const newBlock = {
        id: `tmp-${Date.now()}`,
        type,
        content: "",
        output: "",
        order: nextOrder,
        theme: currentTheme,
      };
      setBlocks((prev) => [...prev, newBlock]);
    } catch (err) {
      console.error(err);
      alert("ブロックの追加に失敗しました。");
    }
  };

  /** ================================
   * ✅ 次のセクションへ（＝次の question を text ブロックとして追加）
   * ================================ */
  const addNextQuestionBlock = async () => {
    const q = questions.find(
      (x) => Number(x?.question) === Number(nextQuestionNum)
    );

    if (!q) {
      alert("次のセクションが見つかりません");
      return;
    }

    try {
      const nextOrder = await getNextOrder(currentTheme);

      const newBlock = {
        id: `q-${currentTheme}-${nextOrder}-${Date.now()}`,
        type: "text",
        content: q.text ?? "",
        output: "",
        order: nextOrder,
        theme: currentTheme,
      };

      // 画面に追加
      setBlocks((prev) => [...prev, newBlock]);

      // DBに保存（テキストなので output 空）
      await saveToDatabase({ ...newBlock, output: "" });

      // 次の問題番号へ
      setNextQuestionNum((n) => n + 1);
    } catch (err) {
      console.error(err);
      alert("クエッションブロックの追加に失敗しました。");
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

    // 実行中フラグON
    setBlocks((prev) =>
      prev.map((b) => (b.id === id ? { ...b, __running: true } : b))
    );

    let outputText = "";

    const print = (...args) => {
      outputText +=
        (outputText ? "\n" : "") +
        args
          .map((v) =>
            typeof v === "object" ? JSON.stringify(v, null, 2) : String(v)
          )
          .join(" ");
    };

    // options = { limit, theme, output(order) }
    const getPosts = async (options = {}) => {
      const { limit = 10, theme = currentTheme, output } = options;

      const params = new URLSearchParams();
      params.set("limit", String(limit));
      params.set("theme", String(theme));

      const res = await fetch(`${API_BASE}/posts/history?${params.toString()}`);
      if (!res.ok) throw new Error("履歴の取得に失敗しました。");

      const posts = await res.json();

      if (output !== undefined && output !== null) {
        const orderNum = Number(output);
        if (Number.isNaN(orderNum)) {
          throw new Error("output には order 番号（数値）を指定してください。");
        }
        const matched = posts.filter((p) => p.order === orderNum);
        return matched.map((p) => ({ output: p.output }));
      }

      return posts;
    };

    const context = {
      getPosts,
      post: async (theme) => {
        const res = await fetch(`${API_BASE}/posts/byTheme?theme=${theme}`);
        if (!res.ok) {
          const text = await res.text().catch(() => "");
          throw new Error(
            `テーマ別postの取得に失敗しました: ${res.status} ${text}`
          );
        }
        return await res.json();
      },
      toCSV: (post) => postToCSV(post),
      postsToCSV: (posts) => postsToCSV(posts),
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

  const currentThemeObj = themes.find((t) => t.id === currentTheme);

  /** ================================
   * UI
   * ================================ */
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
          padding: "10px 24px 14px",
          zIndex: 1000,
          boxSizing: "border-box",
        }}
      >
        {/* 作業コンテキスト */}
        <div style={{ marginBottom: 10 }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>
            {currentThemeObj?.title ?? "テーマの名前"}
          </h2>
          <p style={{ margin: "4px 0 0 0", color: "#666", fontSize: 13 }}>
            ユーザー：pro助 / テーマID：{currentTheme}
          </p>
        </div>

        {/* ボタン行 */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {/* ✅ 追加：次のセクションへ */}
          <button
            onClick={addNextQuestionBlock}
            style={buttonStyle}
            onMouseOver={(e) => (e.currentTarget.style.background = "#eee")}
            onMouseOut={(e) =>
              (e.currentTarget.style.background = "transparent")
            }
          >
            次のセクションへ
          </button>

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

      {/* 2カラム */}
      <div
        style={{
          marginTop: 140,
          display: "flex",
          height: "calc(100vh - 140px)",
        }}
      >
        {/* 左サイドバー（テーマ一覧） */}
        <div
          style={{
            width: 260,
            borderRight: "1px solid #eee",
            padding: "12px 16px",
            boxSizing: "border-box",
          }}
        >
          <h3 style={{ marginTop: 0, fontSize: 14 }}>テーマ一覧</h3>
          <ul
            style={{
              listStyle: "none",
              padding: 0,
              margin: 0,
              fontSize: 13,
            }}
          >
            {themes.map((t) => {
              const active = t.id === currentTheme;
              return (
                <li
                  key={t.id}
                  onClick={() => setCurrentTheme(t.id)}
                  style={{
                    padding: "4px 6px",
                    marginBottom: 4,
                    borderRadius: 4,
                    cursor: "pointer",
                    background: active ? "#e0f2ff" : "transparent",
                    fontWeight: active ? "bold" : "normal",
                  }}
                >
                  {t.title || `テーマ${t.id}`}
                </li>
              );
            })}
          </ul>
        </div>

        {/* 右メインエリア（blocks） */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            display: "flex",
            justifyContent: "center",
          }}
        >
          <div style={{ width: "80%", maxWidth: 900, padding: "0 0 32px" }}>
            {blocks.map((block, index) => (
              <div key={block.id} style={{ display: "flex", marginBottom: 16 }}>
                {/* 添字番号 */}
                <div style={indexLabelStyle}>[{index + 1}]</div>

                {/* カード本体 */}
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

                        <AutoResizeTextarea
                          value={block.content}
                          onChange={(v) => updateBlock(block.id, v)}
                          placeholder={`// 例:\n// const posts = await getPosts({ limit: 3 });\n// print(postsToCSV(posts));\n// return posts.length;`}
                          minRows={1}
                          mono
                        />
                      </div>

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
      </div>
    </div>
  );
}
