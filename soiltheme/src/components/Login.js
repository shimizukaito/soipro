import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const API_BASE_URL = 'http://localhost:3001/api'; 
const TEST_USER = 'pro助'; 
const TEST_PASS = 'pass'; 

function Login({ setAuthToken, setUsername }) {
  const [username, setInputUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
  if (username.length === 0 || password.length === 0) {
    setError('ユーザー名とパスワードを入力してください。（テスト用: pro助 / pass）');
      return;
    }

    try {
      const response = await axios.post(`${API_BASE_URL}/login`, {
        username,
        password,
      });

      const token = response.data.token;
      const loggedInUsername = response.data.username || TEST_USER; 
      
      localStorage.setItem('authToken', token);
      localStorage.setItem('username', loggedInUsername);
      setAuthToken(token);
      setUsername(loggedInUsername);
      
      console.log('✅ 認証成功．Homeへ．');
      navigate('/dashboard'); 

    } catch (err) {
      console.error('Login failed:', err);
      setError(err.response?.data?.error || 'ログインに失敗．サーバーが起動しているか確認');
    }
  };

  return (
    <div>
      <h2>🔑 ログイン</h2>
      <p>デバッグのため、任意の入力をしても **'pro助'** でログインされます。（要：サーバー側でサインアップ済み）</p>
      <form onSubmit={handleSubmit}>
        <div>
          <label>ユーザー名:</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setInputUsername(e.target.value)}
            required
          />
        </div>
        <div>
          <label>パスワード:</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <button type="submit">ログイン</button>
      </form>
    </div>
  );
}

// ⚠️ コンパイルエラー解消のため、このデフォルトエクスポートが必要です
export default Login;