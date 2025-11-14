import express from "express";
import cors from "cors";
import { PrismaClient } from "@prisma/client";
import * as theme from "./theme.js";

const app = express();
const prisma = new PrismaClient();
app.use(cors());
app.use(express.json());

// ===========================
// 1️⃣ 最新データの取得
// ===========================
app.get("/posts", async (req, res) => {
  const theme = Number(req.query.theme) || 1;
  const posts = await prisma.post.findMany({
    where: { theme, isLatest: true },
    orderBy: { order: "asc" },
  });
  res.json(posts);
});

// ===========================
// 2️⃣ 履歴データの取得 (getPost(n))
// ===========================
app.get("/posts/history", async (req, res) => {
  const n = Number(req.query.n) || 1;
  const theme = Number(req.query.theme) || 1;

  const posts = await prisma.post.findMany({
    where: { theme, isLatest: false },
    orderBy: { createdAt: "desc" },
    skip: n - 1,
    take: 1,
  });

  if (posts.length === 0) {
    return res.status(404).json({ message: `履歴${n}件目は存在しません。` });
  }

  res.json(posts[0]);
});

// ===========================
// 3️⃣ 次に使える order 番号を取得
// ===========================
app.get("/posts/nextOrder", async (req, res) => {
  const theme = Number(req.query.theme) || 1;
  const latest = await prisma.post.findFirst({
    where: { theme },
    orderBy: { order: "desc" },
  });
  const nextOrder = latest ? latest.order + 1 : 1;
  res.json({ nextOrder });
});

// ===========================
// 4️⃣ 投稿の追加／更新（isLatest対応）
// ===========================
app.post("/posts", async (req, res) => {
  const { content, output, theme, user, order } = req.body;

  // 同一orderを過去化
  await prisma.post.updateMany({
    where: { theme, order, isLatest: true },
    data: { isLatest: false },
  });

  // 新規追加（最新バージョン）
  const post = await prisma.post.create({
    data: { content, output, theme, user, order, isLatest: true },
  });

  res.json(post);
});

theme.init(app,prisma);

// ===========================
app.listen(3001, () => {
  console.log("✅ Server running on http://localhost:3001");
});
