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
    /* --------------------------------------------------
  ② ログイン（JWT 発行）
  エンドポイント: POST /api/login  👈 パスを修正
-------------------------------------------------- */
app.post("/api/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    console.log("Login request:", req.body);

    // ユーザー名でユーザーを検索
    const user = await prisma.user.findUnique({
      where: { username },
    });

    if (!user) {
      console.log("User not found");
      return res.status(401).json({ error: "Invalid login" });
    }

    // パスワードの比較
    const ok = await bcrypt.compare(password, user.password);
    console.log("Password match:", ok);

    if (!ok) {
      return res.status(401).json({ error: "Invalid login" });
    }

    // JWTを発行
    const token = jwt.sign({ userId: user.id }, SECRET, { expiresIn: '1h' }); 
    console.log("JWT issued for userId:", user.id);

    res.json({ token, username: user.username });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Server error" });
  }
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