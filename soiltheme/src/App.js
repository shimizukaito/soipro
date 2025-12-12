import React, { useState, useEffect, useCallback } from 'react';
import './App.css'; 

// APIのベースURLは残しておく（後で利用するため）
const API_BASE_URL = 'http://localhost:3001'; 

// 初期ダミーデータ (再開)
const DUMMY_THEMES = [
  { id: 101, title: '初期テーマ A ', content: null },
  { id: 102, title: '初期テーマ B ', content: JSON.stringify([
    { question: 1, text: '既存データのテスト', code: 'console.log("Hello");', data: 'a,1\nb,2' },
    { question: 2, text: '2行目のテスト', code: '', data: '' }
  ])},
];

// 表データの初期構造
const initialRowData = {
  question: 1, 
  text: '',    
  code: '',    
  data: '',
};

function App() {
  // --- State管理 ---
  // 初期値をダミーデータに戻す
  const [themes, setThemes] = useState(DUMMY_THEMES); 
  const [selectedThemeId, setSelectedThemeId] = useState(DUMMY_THEMES[0].id); 
  const [rows, setRows] = useState([initialRowData]); 
  const [themeTitle, setThemeTitle] = useState(DUMMY_THEMES[0].title); 
  const [loading, setLoading] = useState(false); // ダミーなので常に false

  // --- API連携ロジック (モックとしてコメントアウト) ---
  
  // ダミーデータからテーマ詳細をロードする内部関数
  const loadThemeDataLocally = (themeId) => {
    const theme = themes.find(t => t.id === themeId);
    if (!theme) return;

    setThemeTitle(theme.title);

    if (theme.content) {
      try {
        const parsedRows = JSON.parse(theme.content);
        setRows(parsedRows);
      } catch (e) {
        console.error("JSONパースエラー:", e);
        setRows([{ ...initialRowData, question: 1 }]);
      }
    } else {
      setRows([{ ...initialRowData, question: 1 }]);
    }
  };

  // 1. テーマ一覧取得 (GET /themes) - モック
  const fetchThemes = useCallback(async () => {
    // setLoading(true); // API通信をコメントアウト
    /* try {
        const response = await fetch(`${API_BASE_URL}/themes`);
        if (!response.ok) throw new Error('テーマ一覧の取得に失敗');
        const data = await response.json();
        setThemes(data);
        if (data.length > 0 && selectedThemeId === null) {
          setSelectedThemeId(data[0].id);
        }
    } catch (error) {
        console.error('テーマ一覧取得エラー:', error);
    } finally {
        // setLoading(false);
    }
    */
    // ダミーデータの IDが更新された場合に備えて、themes stateから初期テーマを選択
    if (themes.length > 0 && selectedThemeId === null) {
      setSelectedThemeId(themes[0].id);
    }
    setLoading(false);
  }, [selectedThemeId, themes]); 


  // 2. テーマデータ取得 (GET /themes/:id) - モック
  const fetchThemeData = useCallback(async (themeId) => {
    if (!themeId) {
        setLoading(false);
        return;
    }
    // setLoading(true); // API通信をコメントアウト
    /*
    try {
      const response = await fetch(`${API_BASE_URL}/themes/${themeId}`);
      // ... API処理 ...
    } catch (error) {
      // ... エラー処理 ...
    } finally {
        setLoading(false);
    }
    */
    // ローカルロード処理を呼び出す
    loadThemeDataLocally(themeId);
    setLoading(false);
  }, [themes]); // themes を依存配列に追加


  // 3. テーマ全体保存 (PUT /themes/saveThemeData) - モック
  const handleSave = () => {
    if (selectedThemeId === null) {
      alert("保存するテーマを選択または作成してください。");
      return;
    }
    
    // rows（表データ）をJSON文字列に変換
    const contentJson = JSON.stringify(rows); 
    
    /* try {
      // ... API呼び出し PUT /themes/saveThemeData ...
      if (!response.ok) throw new Error('テーマデータの保存に失敗しました。');
    } catch (error) {
      // ... エラー処理 ...
    }
    */

    // ⭐ モック処理: 内部 State (themes) を更新
    const updatedThemes = themes.map(t => 
      t.id === selectedThemeId ? { ...t, content: contentJson } : t
    );
    setThemes(updatedThemes);

    alert(`テーマ「${themeTitle}」のデータ (JSON形式) を内部で保存しました！`);
  };

  // 4. 新規テーマ作成 (POST /themes) - モック
  const handleCreateNewTheme = () => {
      const title = prompt("新しいテーマのタイトルを入力してください:");
      if (!title || title.trim() === "") return;
      
      const newThemeId = Math.max(...themes.map(t => t.id)) + 1; // 新しいIDを生成
      const newTheme = { id: newThemeId, title: title, content: null };

      /* try {
          // ... API呼び出し POST /themes ...
      } catch (error) {
          // ... エラー処理 ...
      }
      */
      
      // ⭐ モック処理: 内部 State (themes) を更新
      setThemes([...themes, newTheme]);
      setSelectedThemeId(newThemeId);
      loadThemeDataLocally(newThemeId); // 新しいテーマをロード
      
      alert(`新しいテーマ「${title}」が作成されました！ (ID: ${newThemeId})`);
  };

  // --- UI操作ロジック (変更なし) ---
  
  const handleCellChange = (index, field, value) => {
    const newRows = rows.map((row, i) => 
      i === index ? { ...row, [field]: value } : row
    );
    setRows(newRows);
  };

  const handleAddRow = () => {
    const newQuestionNumber = rows.length > 0 ? rows[rows.length - 1].question + 1 : 1;
    setRows([...rows, { ...initialRowData, question: newQuestionNumber }]);
  };

  const handleDeleteRow = (index) => {
    const newRows = rows.filter((_, i) => i !== index).map((row, i) => ({
      ...row,
      question: i + 1 
    }));
    setRows(newRows);
  };
  
  const handleThemeChange = (e) => {
    const newThemeId = Number(e.target.value);
    setSelectedThemeId(newThemeId);
  };
  
  // --- 初期ロードとデータ切り替え ---

  useEffect(() => {
    // API呼び出しをコメントアウトし、ローカルのテーマ一覧の初期設定を呼び出す
    fetchThemes(); 
  }, [fetchThemes]); 

  useEffect(() => {
    // API呼び出しをコメントアウトし、ローカルのデータロードを呼び出す
    if (selectedThemeId !== null) {
      fetchThemeData(selectedThemeId); 
    }
  }, [selectedThemeId, fetchThemeData]);
  
  // JSON出力プレビュー用のJSON文字列
  const jsonOutput = JSON.stringify(rows.map(row => ({
      question: row.question,
      text: row.text,
      code: row.code,
      data: row.data,
  })), null, 2); 


  // --- JSXレンダリング ---
  
  // ロード中判定を簡略化（ダミーなので）
  if (themes.length === 0 && !loading) {
    return (
      <div className="App">
        <h1>テーマ作成</h1>
        <p>テーマがありません。最初にテーマを作成してください。</p>
        <button onClick={handleCreateNewTheme}>+ 最初のテーマを作成</button>
      </div>
    );
  }

  return (
    <div className="App">
      <h1>テーマ作成</h1>
      <h2>現在のテーマ: {themeTitle || 'テーマを選択してください'}</h2>
      
      <div className="controls">
        <label>
          テーマを選択:
          <select value={selectedThemeId || ''} onChange={handleThemeChange}>
            {themes.map(t => (
              <option key={t.id} value={t.id}>{t.title} (ID: {t.id})</option>
            ))}
          </select>
        </label>
        <button onClick={handleCreateNewTheme}>+ 新しいテーマを作成</button>
        <button onClick={handleSave}>💾 データ内容を内部に保存 (モック)</button>
      </div>
      
      {loading ? (
        <p>データをロード中...</p>
      ) : (
        <>
          <div className="table-container">
            <table>
              <thead>
                <tr><th>Question</th><th>Text</th><th>Code</th><th>Data (CSV形式)</th><th>アクション</th></tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={index}>
                    <td>
                      <input type="number" value={row.question} readOnly style={{ width: '50px', backgroundColor: '#eee' }} />
                    </td>
                    <td><textarea rows="8" value={row.text} onChange={(e) => handleCellChange(index, 'text', e.target.value)} /></td>
                    <td><textarea rows="8" value={row.code} onChange={(e) => handleCellChange(index, 'code', e.target.value)} /></td>
                    <td><textarea rows="8" value={row.data} onChange={(e) => handleCellChange(index, 'data', e.target.value)} /></td>
                    <td>
                      <button onClick={() => handleDeleteRow(index)} disabled={rows.length === 1}>
                        削除
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button onClick={handleAddRow}>+ 質問を追加</button>
          </div>

          <div className="json-output">
            <h3>💡 JSON出力形式 (保存される内容のプレビュー)</h3>
            <p>このデータは現在、内部のダミー State に保存されています。</p>
            <pre><code>{jsonOutput}</code></pre>
          </div>
        </>
      )}
    </div>
  );
}

export default App;