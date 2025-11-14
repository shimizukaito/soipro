export function init(app, prisma) {
    // 登録
    app.get("/register", async (req, res) => {
        const { username, password } = req.body;
        try {
            const user = await prisma.user.create({ data: { username, password } });
            res.json(user);
        } catch {
        res.status(400).json({ error: "ユーザー名が既に存在します" });
        }
    });
    // ログイン
app.post("/login", async (req, res) => {
    const { username, password } = req.body;
    const user = await prisma.user.findUnique({ where: { username } });
    if (!user || user.password !== password) {
      return res.status(401).json({ error: "認証失敗" });
    }
    res.json({ message: "ログイン成功", user });
  });
  
  // テーマ作成
  app.post("/themes", async (req, res) => {
    const { title, content, userId } = req.body;
    const theme = await prisma.theme.create({
      data: { title, content, userId },
    });
    res.json(theme);
  });
  
  // テーマ一覧
  app.get("/themes", async (req, res) => {
    const themes = await prisma.theme.findMany({ include: { user: true } });
    res.json(themes);
  });


}