//表示の順番を
// テキスト
//データ
//プログラム
//の順番にする

//リロードすると脱色されるので色を残して置けるといいね。
//セクションが終わった時にもう一度初めからできるボタンがあるといいね。
//引数をもっと工夫する。fieldという引数を用意して文字で"output"とかを指定すると取れるようにするとかね
//orderを
//最終成果レポート（セットアップの仕方、教材の作り方などをまとめてレポートで提出）ギットハブで提出

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
  const [currentTheme, setCurrentTheme] = useState(1);

  // 進行中のクエッション番号
  const [currentQuestion, setCurrentQuestion] = useState(1);

  // 教材 questions（theme.sections から作る）
  const [questions, setQuestions] = useState([]);
  const [nextQuestionNum, setNextQuestionNum] = useState(1);

  // --- 便利判定 ---
  const isCodeBlock = (block) => block.type === "code" || block.type === "question-code";
  const isQuestionBlock = (block) =>
    block.type === "question" || block.type === "question-code" || block.type === "question-data";

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
          // ✅ question-code も code 扱いにする
          output: isCodeBlock(block) ? block.output ?? "" : "",
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

  // ✅ カード（外枠）の色
  const getBlockStyle = (block) => {
    if (block.type === "question") {
      return { backgroundColor: "#f0f8ff", border: "1px solid #90caf9" };
    }
    if (block.type === "question-code") {
      return { backgroundColor: "#f0f8ff", border: "1px solid #b39ddb" };
    }
    if (block.type === "question-data") {
      return { backgroundColor: "#f0f8ff", border: "1px solid #a5d6a7" };
    }
    if (block.type === "code") {
      return { backgroundColor: "#f8f8f8", border: "1px solid #ddd" };
    }
    return { backgroundColor: "white", border: "1px solid #ddd" };
  };

  // ✅ textarea（入力欄）の色：ここが「テキストボックスの色が変わらない」の本丸
  const getTextareaStyle = (block) => {
    if (block.type === "question") {
      return { background: "#e3f2fd", border: "1px solid #90caf9" };
    }
    if (block.type === "question-data") {
      return {
        background: "#e8f5e9",
        border: "1px solid #a5d6a7",
        fontFamily: "monospace",
        whiteSpace: "pre",
      };
    }
    // question-code は mono が効くので背景はカード側（紫）で見分けるのが自然
    return {};
  };

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
          // NOTE: DBには type を保存していないので、ここは output の有無で code/text に戻る
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
   * ================================ */
  useEffect(() => {
    async function fetchQuestions() {
      try {
        const res = await fetch(`${API_BASE}/themes/${currentTheme}`);
        if (!res.ok) throw new Error("テーマ詳細の取得に失敗しました。");
        const theme = await res.json();

        const sections = theme.sections ?? [];
        console.log("theme.sections =", sections);

        const allQuestions = Array.isArray(sections)
          ? sections.flatMap((s) => {
              if (s && s.question !== undefined) return [s];
              if (s && Array.isArray(s.questions)) return s.questions;
              return [];
            })
          : [];

        allQuestions.sort((a, b) => Number(a.question) - Number(b.question));

        setQuestions(allQuestions);
        setNextQuestionNum(1);
        setCurrentQuestion(1);
      } catch (err) {
        console.error("質問ロード失敗:", err);
        setQuestions([]);
        setNextQuestionNum(1);
        setCurrentQuestion(1);
      }
    }

    fetchQuestions();
  }, [currentTheme]);

  /** ================================
   * ✅ セクション進行を最初からに戻す（画面/DBは消さない）
   * ================================ */
  const resetSection = () => {
    setCurrentQuestion(1);
    setNextQuestionNum(1);
  };

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
   * ✅ 次のセクションへ：問題文 + code + data を追加
   * ================================ */
  const addNextQuestionBlock = async () => {
    const q = questions.find((x) => Number(x.question) === Number(currentQuestion));

    if (!q) {
      alert("次のクエッションがありません");
      return;
    }

    const newBlocks = [];

    // ✅ ① 問題文 → question（ここが重要）
    newBlocks.push({
      type: "question",
      content: q.text ?? "",
    });

    // ② code があれば → question-code（コードブロック扱い）
    if (q.code && q.code.trim() !== "") {
      newBlocks.push({
        type: "question-code",
        content: q.code,
        output: "",
      });
    }

    // ③ data があれば → question-data
    if (q.data && q.data.trim() !== "") {
      newBlocks.push({
        type: "question-data",
        content: `【データ】\n${q.data}`,
      });
    }

    let order = await getNextOrder(currentTheme);

    const finalized = newBlocks.map((b) => ({
      ...b,
      id: Date.now() + Math.random(),
      order: order++,
      theme: currentTheme,
    }));

    setBlocks((prev) => [...prev, ...finalized]);

    for (const b of finalized) {
      await saveToDatabase({
        ...b,
        output: isCodeBlock(b) ? "" : "",
      });
    }

    setCurrentQuestion((n) => n + 1);
    setNextQuestionNum((n) => n + 1);
  };

  /** ================================
   * 入力更新
   * ================================ */
  const updateBlock = (id, newContent) => {
    setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, content: newContent } : b)));
  };

  /** ================================
   * コード実行
   * ================================ */
  const runCode = async (id) => {
    const block = blocks.find((b) => b.id === id);
    if (!block) return;

    setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, __running: true } : b)));

    let outputText = "";

    const print = (...args) => {
      outputText +=
        (outputText ? "\n" : "") +
        args
          .map((v) => (typeof v === "object" ? JSON.stringify(v, null, 2) : String(v)))
          .join(" ");
    };

    const getPosts = async (options = {}) => {
      const {
        limit = 10, // 取得件数（履歴用）
        theme = currentTheme, // テーマID（省略時は現在のテーマ）
        order, // order番号（指定時）
        latest = true, // order指定時は最新のみ返す
      } = options;

      const params = new URLSearchParams();
      params.set("theme", String(theme));

      // 履歴取得用
      if (order === undefined) {
        params.set("limit", String(limit));
      }

      // order 指定がある場合
      if (order !== undefined) {
        if (Number.isNaN(Number(order))) {
          throw new Error("order には数値を指定してください");
        }
        params.set("order", String(order));
        if (latest) {
          params.set("latest", "true");
        }
      }

      const res = await fetch(`${API_BASE}/posts/history?${params.toString()}`);
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`履歴の取得に失敗しました: ${res.status} ${text}`);
      }

      return await res.json(); // 常に配列を返す
    };

    const context = {
      getPosts,
      post: async (theme) => {
        const res = await fetch(`${API_BASE}/posts/byTheme?theme=${theme}`);
        if (!res.ok) {
          const text = await res.text().catch(() => "");
          throw new Error(`テーマ別postの取得に失敗しました: ${res.status} ${text}`);
        }
        return await res.json();
      },
      toCSV: (post) => postToCSV(post),
      postsToCSV: (posts) => postsToCSV(posts),
      print,
    };

    try {
      const result = await asyncEval(block.content.trim(), context);
      if (result !== undefined) outputText += (outputText ? "\n" : "") + String(result);
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
        <div style={{ marginBottom: 10 }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>{currentThemeObj?.title ?? "テーマの名前"}</h2>
          <p style={{ margin: "4px 0 0 0", color: "#666", fontSize: 13 }}>
            ユーザー：pro助 / テーマID：{currentTheme}
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {/* ✅ 追加：最初から（進行だけリセット） */}
          <button
            onClick={resetSection}
            style={buttonStyle}
            onMouseOver={(e) => (e.currentTarget.style.background = "#eee")}
            onMouseOut={(e) => (e.currentTarget.style.background = "transparent")}
          >
            最初から
          </button>

          <button
            onClick={addNextQuestionBlock}
            style={buttonStyle}
            onMouseOver={(e) => (e.currentTarget.style.background = "#eee")}
            onMouseOut={(e) => (e.currentTarget.style.background = "transparent")}
          >
            次のセクションへ
          </button>

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
      </div>

      {/* 2カラム */}
      <div style={{ marginTop: 140, display: "flex", height: "calc(100vh - 140px)" }}>
        {/* 左サイドバー */}
        <div
          style={{
            width: 260,
            borderRight: "1px solid #eee",
            padding: "12px 16px",
            boxSizing: "border-box",
          }}
        >
          <h3 style={{ marginTop: 0, fontSize: 14 }}>テーマ一覧</h3>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, fontSize: 13 }}>
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

        {/* 右メイン */}
        <div style={{ flex: 1, overflowY: "auto", display: "flex", justifyContent: "center" }}>
          <div style={{ width: "80%", maxWidth: 900, padding: "0 0 32px" }}>
            {blocks.map((block, index) => (
              <div key={block.id} style={{ display: "flex", marginBottom: 16 }}>
                <div style={indexLabelStyle}>[{index + 1}]</div>

                {/* ✅ カード本体：getBlockStyle を反映 */}
                <div
                  style={{
                    flex: 1,
                    borderRadius: 6,
                    padding: "8px 10px",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                    ...getBlockStyle(block),
                  }}
                >
                  {/* ✅ question-code も code 扱い */}
                  {isCodeBlock(block) ? (
                    <>
                      <div style={{ display: "flex", alignItems: "flex-start" }}>
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
                            cursor: block.__running ? "not-allowed" : "pointer",
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
                      // ✅ クエッションは編集禁止にしたいなら true（任意）
                      readOnly={isQuestionBlock(block)}
                      // ✅ ここで textarea の背景色も変える（重要）
                      style={{
                        fontSize: 15,
                        ...getTextareaStyle(block),
                      }}
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
