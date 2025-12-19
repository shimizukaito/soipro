import express from "express";
import cors from "cors";
import { PrismaClient } from "@prisma/client";
import * as theme from "./theme.js";

const app = express();
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());

// ===========================
// 1️⃣ 最新データの取得（isLatest = true）
//     GET /posts?theme=1
// ===========================
app.get("/posts", async (req, res) => {
  const themeId = Number(req.query.theme) || 1;

  try {
    const posts = await prisma.post.findMany({
      where: { theme: themeId, isLatest: true },
      orderBy: { order: "asc" },
    });
    res.json(posts);
  } catch (err) {
    console.error("最新データ取得エラー:", err);
    res.status(500).json({ message: "最新データの取得に失敗しました。" });
  }
});


app.get("/posts/history", async (req, res) => {
  const themeId = Number(req.query.theme) || 1;
  const order = req.query.order !== undefined ? Number(req.query.order) : undefined;
  const latest = req.query.latest === "true";

  try {
    // ★ order + latest 指定 → 最新1件だけ
    if (order !== undefined && latest) {
      const post = await prisma.post.findFirst({
        where: { theme: themeId, order, isLatest: false },
        orderBy: { createdAt: "desc" },
      });
      return res.json(post ? [post] : []);
    }

    // 通常の履歴取得
    const limit = req.query.limit ? Number(req.query.limit) : 10;

    const posts = await prisma.post.findMany({
      where: {
        theme: themeId,
        isLatest: false,
        ...(order !== undefined ? { order } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    res.json(posts);
  } catch (err) {
    console.error("履歴取得エラー:", err);
    res.status(500).json({ message: "履歴の取得に失敗しました。" });
  }
});


// ===========================
// 3️⃣ 次に使える order 番号を取得
//     GET /posts/nextOrder?theme=1
// ===========================
app.get("/posts/nextOrder", async (req, res) => {
  const themeId = Number(req.query.theme) || 1;

  try {
    const latest = await prisma.post.findFirst({
      where: { theme: themeId },
      orderBy: { order: "desc" },
    });
    const nextOrder = latest ? latest.order + 1 : 1;
    res.json({ nextOrder });
  } catch (err) {
    console.error("nextOrder取得エラー:", err);
    res.status(500).json({ message: "nextOrderの取得に失敗しました。" });
  }
});

// ===========================
// 🔵 テーマごとの全 post を取得
//     GET /posts/byTheme?theme=1
// ===========================
app.get("/posts/byTheme", async (req, res) => {
  const themeId = Number(req.query.theme) || 1;
  console.log("🔎 /posts/byTheme called, theme =", themeId);

  try {
    const posts = await prisma.post.findMany({
      where: { theme: themeId },
      orderBy: { createdAt: "desc" },
    });
    res.json(posts);
  } catch (err) {
    console.error("テーマ別post取得エラー:", err);
    res.status(500).json({
      message: "テーマ別postの取得に失敗しました。",
      detail: String(err),
    });
  }
});

// ===========================
// 4️⃣ 投稿の追加／更新（isLatest対応）
//     POST /posts
// ===========================
app.post("/posts", async (req, res) => {
  const { content, output, theme: themeId, user, order } = req.body;

  try {
    // 同一 theme + order の最新を過去化
    await prisma.post.updateMany({
      where: { theme: themeId, order, isLatest: true },
      data: { isLatest: false },
    });

    // 新規追加（最新バージョン）
    const post = await prisma.post.create({
      data: {
        content,
        output,
        theme: themeId,
        user,
        order,
        isLatest: true,
      },
    });

    res.json(post);
  } catch (err) {
    console.error("投稿保存エラー:", err);
    res.status(500).json({ message: "投稿の保存に失敗しました。" });
  }
});

// ===========================
// 5️⃣ テーマ一覧取得
//     GET /themes
// ===========================
app.get("/themes", async (req, res) => {
  try {
    const themes = await prisma.theme.findMany({
      orderBy: { id: "asc" },
      // sections も一緒に返る（Jsonカラムならそのまま返る）
    });
    res.json(themes);
  } catch (err) {
    console.error("テーマ一覧取得エラー:", err);
    res.status(500).json({ message: "テーマ一覧の取得に失敗しました。" });
  }
});

// ===========================
// ✅ 追加：テーマ1件取得（question表示に必要）
//     GET /themes/:id
// ===========================
app.get("/themes/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) return res.status(400).json({ message: "invalid id" });

  try {
    const t = await prisma.theme.findUnique({ where: { id } });
    if (!t) return res.status(404).json({ message: "theme not found" });
    res.json(t);
  } catch (err) {
    console.error("テーマ詳細取得エラー:", err);
    res.status(500).json({ message: "テーマ詳細の取得に失敗しました。" });
  }
});

// 既存の theme 関連初期化（中でルートを追加しているならこのまま）
theme.init(app, prisma);

// ===========================
// サーバ起動
// ===========================
app.listen(3001, () => {
  console.log("✅ Server running on http://localhost:3001");
});
