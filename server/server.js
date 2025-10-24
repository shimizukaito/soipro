import express from "express";
import cors from "cors";
import { PrismaClient } from "@prisma/client";

const app = express();
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());

// ボタンが押されたときのAPI
app.post("/buttons", async (req, res) => {
  try {
    const { type } = req.body;
    if (!type) return res.status(400).json({ error: "typeがありません" });

    const now = new Date();
    const saved = await prisma.buttonLog.create({
      data: { type, timestamp: now },
    });

    res.status(201).json(saved);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "保存失敗" });
  }
});

// 全履歴確認API（ブラウザで http://localhost:3001/buttons ）
app.get("/buttons", async (req, res) => {
  const logs = await prisma.buttonLog.findMany({ orderBy: { timestamp: "desc" } });
  res.json(logs);
});


app.post("/posts", async (req, res) => {
  const { content, output, theme, user, order } = req.body;

  // 既存の同order投稿を「最新でない」にする
  await prisma.post.updateMany({
    where: { theme, order, isLatest: true },
    data: { isLatest: false },
  });

  // 新しいレコードを最新として追加
  const post = await prisma.post.create({
    data: { content, output, theme, user, order, isLatest: true },
  });

  res.json(post);
});

app.get("/posts", async (req, res) => {
  const theme = Number(req.query.theme) || 1;
  const posts = await prisma.post.findMany({
    where: { theme, isLatest: true },
    orderBy: { order: "asc" },
  });
  res.json(posts);
});

app.listen(3001, () => console.log("APIサーバ起動：http://localhost:3001")); //ここでローカルホストの3001番に開く