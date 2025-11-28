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
// 2️⃣ 履歴データの取得 (getPost(n))
// ===========================
app.get("/posts/history", async (req, res) => {
  const n = Number(req.query.n) || 1;
  const themeId = Number(req.query.theme) || 1;

  try {
    const posts = await prisma.post.findMany({
      where: { theme: themeId, isLatest: false },
      orderBy: { createdAt: "desc" },
      skip: n - 1,
      take: 1,
    });

    if (posts.length === 0) {
      return res
        .status(404)
        .json({ message: `履歴${n}件目は存在しません。` });
    }

    res.json(posts[0]);
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
// 🔵 追加：テーマごとの全 post を取得
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
  const { content, output, theme, user, order } = req.body;

  try {
    // 同一 theme + order の最新を過去化
    await prisma.post.updateMany({
      where: { theme, order, isLatest: true },
      data: { isLatest: false },
    });

    // 新規追加（最新バージョン）
    const post = await prisma.post.create({
      data: { content, output, theme, user, order, isLatest: true },
    });

    res.json(post);
  } catch (err) {
    console.error("投稿保存エラー:", err);
    res.status(500).json({ message: "投稿の保存に失敗しました。" });
  }
});

// 既存の theme 関連初期化
theme.init(app, prisma);

// ===========================
app.listen(3001, () => {
  console.log("✅ Server running on http://localhost:3001");
});

//＝＝＝＝＝＝＝＝＝＝テーマ取得用＝＝＝＝＝＝＝＝＝

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