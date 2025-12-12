import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const API_BASE_URL = 'http://localhost:3001/api';

function Dashboard({ username }) {
  const navigate = useNavigate();
  const [themes, setThemes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchThemes();
  }, []);

  const fetchThemes = async () => {
    setIsLoading(true);
    setError('');
    const authToken = localStorage.getItem('authToken');

    try {
      const response = await axios.get(`${API_BASE_URL}/themes`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      setThemes(response.data);
    } catch (err) {
      console.error('テーマ取得エラー:', err);
      setError('テーマ一覧の取得に失敗しました。');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <h2>✨ Home </h2>
      <p>ようこそ、**{username}** さん。</p>
      
      <h3>テーマ一覧</h3>
      {isLoading ? (
        <p>テーマを読み込み中...</p>
      ) : error ? (
        <p style={{ color: 'red' }}>{error}</p>
      ) : themes.length === 0 ? (
        <p>まだテーマがありません。新しいテーマを作成してください。</p>
      ) : (
        <ul>
          {themes.map(theme => (
            <li key={theme.id}>
              **{theme.title}** (作成日: {new Date(theme.createdAt).toLocaleDateString()})
            </li>
          ))}
        </ul>
      )}

      <hr/>
      
      <button 
        onClick={() => navigate('/create-theme')}
        style={{ padding: '10px 20px', fontSize: '16px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
      >
        ＋新しいテーマを作成する
      </button>
    </div>
  );
}

export default Dashboard;
