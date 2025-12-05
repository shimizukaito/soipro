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

// ===========================
// 2️⃣ 履歴データの取得（getHistory 用）
//     GET /posts/history?limit=5&theme=1
// ===========================
app.get("/posts/history", async (req, res) => {
  const themeId = Number(req.query.theme) || 1;

  // 直近 n 件を返す。?limit がなければ ?n を見る（互換用）、なければデフォルト10件
  const limit = req.query.limit
    ? Number(req.query.limit)
    : req.query.n
    ? Number(req.query.n)
    : 10;

  try {
    const posts = await prisma.post.findMany({
      where: { theme: themeId, isLatest: false }, // 履歴のみ
      orderBy: { createdAt: "desc" },             // 新しい順
      take: limit,
    });

    res.json(posts); // 配列で返す
  } catch (err) {
    console.error("履歴取得エラー:", err);
    res.status(500).json({ message: "履歴の取得に失敗しました。" });
  }
});

// ===========================
// 3️⃣ 次に使える order 番号を取得
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
      where: { theme: themeId },       // isLatest 条件なしで全部
      orderBy: { createdAt: "desc" },  // 必要なら order に変更OK
    });
    res.json(posts);
  } catch (err) {
    console.error("テーマ別post取得エラー:", err);
    res
      .status(500)
      .json({ message: "テーマ別postの取得に失敗しました。", detail: String(err) });
  }
});

// ===========================
// 4️⃣ 投稿の追加／更新（isLatest対応）
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

app.get("/posts/byOrder", async (req, res) => {
  const { order, theme } = req.query;

  if (!order || !theme) {
    return res.status(400).send("order と theme を指定してください");
  }

  const post = await prisma.posts.findFirst({
    where: { order: Number(order), theme: Number(theme) },
  });

  if (!post) return res.status(404).send("該当する post がありません");

  res.json(post);
});

// ===========================
// 5️⃣ テーマ一覧取得
//     GET /themes
// ===========================
app.get("/themes", async (req, res) => {
  try {
    const themes = await prisma.theme.findMany({
      orderBy: { id: "asc" }, // 必要に応じて title などに変更
    });
    res.json(themes);
  } catch (err) {
    console.error("テーマ一覧取得エラー:", err);
    res.status(500).json({ message: "テーマ一覧の取得に失敗しました。" });
  }
});

// 既存の theme 関連初期化（もし中でルートを追加しているならこのまま）
theme.init(app, prisma);

// ===========================
// サーバ起動
// ===========================
app.listen(3001, () => {
  console.log("✅ Server running on http://localhost:3001");
});
