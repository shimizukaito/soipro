import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const API_BASE_URL = 'http://localhost:3001/api'; 
// 遷移先のReactアプリのURL
const TARGET_APP_URL = 'http://localhost:3000'; 

function CreateTheme({ username }) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    
    const token = localStorage.getItem('authToken');
    
    if (!token) {
        setError('認証トークンが見つかりません。再ログインしてください。');
        navigate('/'); // ログインページへ戻る
        return;
    }

    try {
      // サーバーのテーマ作成API（/api/themes）を呼び出す
      const response = await axios.post(
        `${API_BASE_URL}/themes`,
        {
          title,
          content,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const createdThemeId = response.data.theme.id; 
      
      const redirectUrl = `${TARGET_APP_URL}/view-theme?id=${createdThemeId}`;
      
      console.log(`テーマ作成成功。ID: ${createdThemeId}。ポート3000へ遷移します: ${redirectUrl}`);
      window.location.href = redirectUrl;

    } catch (err) {
      console.error('テーマ作成失敗:', err);
      setError(err.response?.data?.error || 'テーマの作成に失敗しました。');
    }
  };

  return (
    <div>
      <h2>✏️ テーマ作成</h2>
      {username && <p>ユーザー: **{username}**</p>}
      
      <form onSubmit={handleSubmit}>
        <div>
          <label>テーマタイトル:</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>
        <div>
          <label>内容:</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            required
          />
        </div>
        
        {error && <p style={{ color: 'red' }}>{error}</p>}
        {successMessage && <p style={{ color: 'green' }}>{successMessage}</p>}
        
        <button type="submit">テーマを保存してポート3000へ</button>
      </form>
    </div>
  );
}

export default CreateTheme;