import React, { useState } from "react";
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const SimpleLogin = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginData, setLoginData] = useState({ username: '', password: '' });
  const [message, setMessage] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setMessage('Attempting login...');
    
    try {
      console.log('API URL:', `${API}/admin/login`);
      const response = await axios.post(`${API}/admin/login`, loginData);
      console.log('Login response:', response.data);
      
      setMessage('Login successful!');
      setIsAuthenticated(true);
      
    } catch (error) {
      console.error('Login error:', error);
      setMessage('Login failed: ' + (error.response?.data?.detail || error.message));
    }
  };

  if (isAuthenticated) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h1>Login Successful!</h1>
        <p>Welcome to the Hotel Management System</p>
        <button onClick={() => setIsAuthenticated(false)}>Logout</button>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', maxWidth: '400px', margin: '0 auto' }}>
      <h1>Simple Login Test</h1>
      <form onSubmit={handleLogin}>
        <div style={{ marginBottom: '10px' }}>
          <label>Username:</label>
          <input
            type="text"
            value={loginData.username}
            onChange={(e) => setLoginData({...loginData, username: e.target.value})}
            style={{ width: '100%', padding: '5px' }}
          />
        </div>
        <div style={{ marginBottom: '10px' }}>
          <label>Password:</label>
          <input
            type="password"
            value={loginData.password}
            onChange={(e) => setLoginData({...loginData, password: e.target.value})}
            style={{ width: '100%', padding: '5px' }}
          />
        </div>
        <button type="submit" style={{ width: '100%', padding: '10px' }}>
          Login
        </button>
      </form>
      {message && <p style={{ marginTop: '10px', color: 'blue' }}>{message}</p>}
      <p style={{ marginTop: '20px', fontSize: '12px' }}>
        Backend URL: {BACKEND_URL}<br/>
        API URL: {API}
      </p>
    </div>
  );
};

export default SimpleLogin;