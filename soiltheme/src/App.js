import React, { useState, useEffect, useCallback } from 'react';
import './App.css'; 

// APIのベースURL
const API_BASE_URL = 'http://localhost:3001'; 

// 表データの初期構造
const initialRowData = {
  question: 1, 
  text: '',    
  code: '',    
  data: '',
};

function App() {
  // --- State管理 ---
  // 初期値をDB連携用に変更 (空/null)
  const [themes, setThemes] = useState([]); 
  const [selectedThemeId, setSelectedThemeId] = useState(null); 
  const [rows, setRows] = useState([initialRowData]); 
  const [themeTitle, setThemeTitle] = useState(''); 
  const [loading, setLoading] = useState(true); // 初期ロードはtrue

  // --- API連携ロジック ---

  // 1. テーマ一覧取得 (GET /themes)
  const fetchThemes = useCallback(async () => {
    setLoading(true); 
    try {
        const response = await fetch(`${API_BASE_URL}/themes`);
        if (!response.ok) throw new Error('テーマ一覧の取得に失敗');
        const data = await response.json();
        setThemes(data);
        
        if (data.length > 0 && selectedThemeId === null) {
          setSelectedThemeId(data[0].id);
        } else if (data.length === 0) {
          setSelectedThemeId(null);
          setThemeTitle('');
          setRows([initialRowData]);
        }
    } catch (error) {
        console.error('テーマ一覧取得エラー:', error);
        alert('テーマ一覧の取得に失敗しました。サーバーが起動しているか確認してください。');
    } finally {
        setLoading(false);
    }
  }, [selectedThemeId]); 


  // 2. テーマデータ取得 (GET /themes/:id)
  const fetchThemeData = useCallback(async (themeId) => {
    if (!themeId) {
        setThemeTitle('');
        setRows([{ ...initialRowData, question: 1 }]);
        setLoading(false);
        return;
    }
    setLoading(true); 
    
    try {
      const response = await fetch(`${API_BASE_URL}/themes/${themeId}`);
      if (!response.ok) throw new Error('テーマデータの取得に失敗');
      
      const theme = await response.json();
      setThemeTitle(theme.title);
      
      // ★ 修正: theme.content から theme.sections に変更
      if (theme.sections) { 
        try {
          // ★ 修正: theme.content から theme.sections に変更
          const parsedRows = JSON.parse(theme.sections); 
          // question番号を整理し、初期構造を適用
          const cleanRows = parsedRows.map((row, index) => ({
              ...initialRowData, 
              ...row,
              question: index + 1
          }));
          setRows(cleanRows.length > 0 ? cleanRows : [{ ...initialRowData, question: 1 }]);
        } catch (e) {
          console.error("JSONパースエラー (DBデータ):", e);
          setRows([{ ...initialRowData, question: 1 }]);
        }
      } else {
        setRows([{ ...initialRowData, question: 1 }]);
      }
    } catch (error) {
      console.error('テーマデータ取得エラー:', error);
      alert('テーマデータの取得に失敗しました。');
      setThemeTitle('');
      setRows([{ ...initialRowData, question: 1 }]);
    } finally {
        setLoading(false);
    }
  }, []); 


 // 3. テーマ内容の保存/更新 (PUT /themes/saveThemeData)
  const handleUpdate = async() => {    
    if (selectedThemeId === null) {
      alert("保存するテーマを選択または作成してください。");
      return;
    }
    
    // rows（表データ：配列）をJSON文字列に変換し、contentJsonとして送信する
    const contentJson = JSON.stringify(rows); 
    
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/themes/saveThemeData`,{ 
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          themeId: selectedThemeId, // 選択中のテーマID
          contentJson: contentJson, // 保存する内容（JSON文字列）
        }),
      });

      if (!response.ok) {
        throw new Error(`テーマデータの保存に失敗しました: ${response.statusText}`);
      }
      
      alert(`テーマ「${themeTitle}」の内容を保存しました！`);
    } catch (error) {
      console.error('テーマデータ保存エラー:', error);
      alert('テーマ内容の保存に失敗しました。');
    } finally {
      setLoading(false);
    }
  };


  // 4. 新規テーマ作成 (POST /themes)
  const handleCreateNewTheme = async() => {
    const title = prompt("新しいテーマのタイトルを入力してください:");
      if (!title || title.trim() === "") return;
      
      setLoading(true); 
      try {
        // サーバー側の POST /themes は title のみを受け取る
        const response = await fetch(`${API_BASE_URL}/themes/`,{
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: title, 
          }),
        });
        if (!response.ok) {
          throw new Error(`テーマ作成に失敗しました: ${response.statusText}`);
        }
        
        const newTheme = await response.json(); 
        
        setThemes((prevThemes) => [...prevThemes, { id: newTheme.id, title: newTheme.title }]);
        setSelectedThemeId(newTheme.id);
        
        alert(`新しいテーマ「${title}」が作成されました！ (ID: ${newTheme.id})`);
        
    } catch (error) {
        console.error('新規テーマ作成エラー:', error);
        alert('新しいテーマの作成に失敗しました。');
    } finally {
      setLoading(false);
    }
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
    fetchThemes(); 
  }, [fetchThemes]); 

  useEffect(() => {
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
  
  if (loading && themes.length === 0 && selectedThemeId === null) {
    return (
      <div className="App">
        <h1>テーマ作成</h1>
        <p>データをロード中...</p>
      </div>
    );
  }
  
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
          <select value={selectedThemeId || ''} onChange={handleThemeChange} disabled={loading}>
            {themes.map(t => (
              <option key={t.id} value={t.id}>{t.title} (ID: {t.id})</option>
            ))}
          </select>
        </label>
        <button onClick={handleCreateNewTheme} disabled={loading}>+ 新しいテーマを作成</button>
        <button onClick={handleUpdate} disabled={loading || selectedThemeId === null}>💾 データ内容を保存</button>
      </div>
      
      {loading && selectedThemeId !== null ? (
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
            <pre><code>{jsonOutput}</code></pre>
          </div>
        </>
      )}
    </div>
  );
}

export default App;