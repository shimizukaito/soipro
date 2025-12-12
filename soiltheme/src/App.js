import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import CreateTheme from './components/CreateTheme';

// ログイン状態に応じてアクセスを制御するコンポーネント
const ProtectedRoute = ({ children, authToken }) => {
  if (!authToken) {
    // トークンがなければログインページへ強制リダイレクト
    return <Navigate to="/login" replace />;
  }
  return children; // トークンがあれば、要求されたコンポーネントを表示
};

function App() {
  // トークンとユーザ名をlocalStorageから初期ロード
  const [authToken, setAuthToken] = useState(localStorage.getItem('authToken'));
  const [username, setUsername] = useState(localStorage.getItem('username') || '');

  // 状態変更の監視ログ（デバッグ用）
  useEffect(() => {
    console.log('🔄 App.js state changed: authToken is now:', authToken ? 'set' : 'null');
  }, [authToken]);


  // ログアウト処理
  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('username');
    setAuthToken(null);
    setUsername('');
  };

  return (
    <Router>
      <header>
        <nav style={{ padding: '10px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between' }}>
          {authToken && username && <span>ようこそ, **{username}** さん | </span>}
          {authToken ? (
            <button onClick={handleLogout} style={{ marginLeft: 'auto' }}>ログアウト</button>
          ) : (
            <span>未ログイン</span>
          )}
        </nav>
      </header>
      <main style={{ padding: '20px' }}>
        <Routes>
          {/* ログインページ */}
          <Route 
            path="/login" 
            element={authToken 
              // ログイン済みならダッシュボードへリダイレクト
              ? <Navigate to="/dashboard" replace /> 
              // 未ログインならLoginコンポーネントを表示
              : <Login setAuthToken={setAuthToken} setUsername={setUsername} />} 
          />
          
          {/* 保護されたルート（ダッシュボード） */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute authToken={authToken}>
                <Dashboard username={username} /> 
              </ProtectedRoute>
            }
          />
          
          {/* 保護されたルート（テーマ作成画面） */}
          <Route
            path="/create-theme"
            element={
              <ProtectedRoute authToken={authToken}>
                <CreateTheme />
              </ProtectedRoute>
            }
          />

          {/* ルートURLアクセス時のデフォルトリダイレクト */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          
          <Route path="*" element={<h1>404 Not Found</h1>} />
        </Routes>
      </main>
    </Router>
  );
}

export default App;