// theme.js

export function init(app, prisma) {
    
  // ===================================
  // 1. テーマ作成 (POST /themes)
  // ===================================
  app.post("/themes", async (req, res) => {
      const { title } = req.body;
      const userId = 1; // 認証なしのため固定値
      console.log(title)
      try {
          const theme = await prisma.theme.create({
              data: { 
                  title, 
                  userId: userId, 
              },
          });
          res.json(theme); 
      } catch (err) {
          console.error("テーマ作成エラー:", err.message);
          res.status(500).json({ message: "テーマの作成に失敗しました。" });
      }
  });

  // ===================================
  // 2. テーマ全体データ保存 (PUT /themes/saveThemeData)
  // content (description) を保存
  // ===================================
  app.put("/themes/saveThemeData", async (req, res) => {
      const { themeId, contentJson } = req.body; 

      if (!themeId || !contentJson) {
          return res.status(400).json({ message: "themeId と contentJson が必要です。" });
      }

      try {
          const updatedTheme = await prisma.theme.update({
              where: { id: themeId },
              data: { 
                  sections: contentJson, // JSON文字列を Theme.content に保存
              },
          });
          res.json(updatedTheme); 
      } catch (err) {
          console.error("テーマデータ保存エラー:", err.message); 
          res.status(500).json({ message: "テーマデータの保存に失敗しました。" });
      }
  });

  // ===================================
  // 3. テーマ詳細取得 (GET /themes/:id)
  // content (description) を復元用に取得
  // ===================================
  app.get("/themes/:id", async (req, res) => {
      const themeId = Number(req.params.id);

      try {
          const theme = await prisma.theme.findUnique({
              where: { id: themeId },
              select: { id: true, title: true, content: true }, 
          });

          if (!theme) {
              return res.status(404).json({ message: "テーマが見つかりません。" });
          }
          res.json(theme);
      } catch (err) {
          console.error("テーマ詳細取得エラー:", err.message); 
          res.status(500).json({ message: "テーマ詳細の取得に失敗しました。" });
      }
  });
  
  // ===================================
  // 4. テーマ一覧取得 (GET /themes)
  // server.js 側の既存ルートと衝突する場合、こちらを優先
  // ===================================
  app.get("/themes", async (req, res) => {
      try {
          const themes = await prisma.theme.findMany({ 
              select: { id: true, title: true },
              orderBy: { id: "asc" }, 
          });
          res.json(themes);
      } catch (err) {
          console.error("テーマ一覧取得エラー (theme.js):", err.message);
          res.status(500).json({ message: "テーマの一覧取得に失敗しました。" });
      }
  });
}