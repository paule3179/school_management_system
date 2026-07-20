// src/context/AuthContext.jsx
import React, { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    const storedRole = localStorage.getItem('userRole');
    
    console.log('AuthProvider init - token:', !!token, 'storedUser:', !!storedUser);
    
    if (token && storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        setUserRole(storedRole || parsedUser.role);
        console.log('User restored from localStorage:', parsedUser);
      } catch (error) {
        console.error('Error parsing user:', error);
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        localStorage.removeItem('userRole');
      }
    }
    setLoading(false);
  }, []);

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