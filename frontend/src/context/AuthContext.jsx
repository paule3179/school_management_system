// src/context/AuthContext.jsx
import React, { useState } from 'react';
import { AuthContext } from './AuthContextCore';

const getStoredAuth = () => {
  const token = localStorage.getItem('token');
  const storedUser = localStorage.getItem('user');
  if (!token || !storedUser) return { user: null, userRole: null };

  try {
    const user = JSON.parse(storedUser);
    return { user, userRole: localStorage.getItem('userRole') || user.role };
  } catch (error) {
    console.error('Error restoring saved user:', error);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    localStorage.removeItem('userRole');
    return { user: null, userRole: null };
  }
};

export const AuthProvider = ({ children }) => {
  const [storedAuth] = useState(getStoredAuth);
  const [user, setUser] = useState(storedAuth.user);
  const [userRole, setUserRole] = useState(storedAuth.userRole);
  const [loading] = useState(false);

  const login = (userData, token) => {
    console.log('🔐 AuthContext.login called with:', { userData, token: token?.substring(0, 50) + '...' });
    
    if (!userData || !token) {
      console.error('❌ Missing userData or token in login');
      return;
    }
    
    setUser(userData);
    setUserRole(userData.role);
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('userRole', userData.role);
    
    console.log('✅ User saved to localStorage. Role:', userData.role);
    
    // Force redirect based on role
    if (userData.role === 'admin') {
      console.log('Redirecting to /admin');
      window.location.href = '/admin';
    } else if (userData.role === 'teacher') {
      console.log('Redirecting to /teacher');
      window.location.href = '/teacher';
    } else if (userData.role === 'parent') {
      console.log('Redirecting to /parent');
      window.location.href = '/parent';
    } else {
      console.log('Unknown role, redirecting to /dashboard');
      window.location.href = '/dashboard';
    }
  };

  const logout = () => {
    setUser(null);
    setUserRole(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('userRole');
    window.location.href = '/login';
  };

  const updateUser = (updatedData) => {
    const updatedUser = { ...user, ...updatedData };
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      userRole, 
      loading, 
      login, 
      logout, 
      updateUser,
      isAuthenticated: !!user
    }}>
      {children}
    </AuthContext.Provider>
  );
};
