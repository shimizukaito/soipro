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

// 🔽 新規投稿を保存するAPI
app.post("/posts", async (req, res) => {
  try {
    const { content, output, theme, user } = req.body;

    const newPost = await prisma.post.create({
      data: {
        content,
        output,
        theme,
        user,
      },
    });

    res.status(201).json(newPost);
  } catch (err) {
    console.error("Error creating post:", err);
    res.status(500).json({ error: "DBへの保存に失敗しました" });
  }
});

// 🔽 投稿一覧を取得するAPI（確認用）
app.get("/posts", async (req, res) => {
  const posts = await prisma.post.findMany({
    orderBy: { id: "desc" },
  });
  res.json(posts);
});

app.listen(3001, () => console.log("APIサーバ起動：http://localhost:3001")); //ここでローカルホストの3001番に開く