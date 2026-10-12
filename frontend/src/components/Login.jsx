import { API_BASE, apiFetch } from '../services/api.js';
// src/components/Login.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/useAuth';
import geebzLogo from '../assets/geebz.png';
import './Login.css';


const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [currentSlide, setCurrentSlide] = useState(0);
  const [logoExists, setLogoExists] = useState(true);

  const { login } = useAuth(); // Use AuthContext instead of onLogin prop

  // Carousel items
  const carouselItems = [
    {
      id: 1,
      image: "https://images.pexels.com/photos/5212345/pexels-photo-5212345.jpeg?w=600&h=400&fit=crop",
      message: "Every child deserves a champion – an adult who will never give up on them.",
      author: "Rita Pierson",
      studentName: "Kwame Mensah",
      grade: "Primary 6",
      achievement: "Best in Mathematics"
    },
    {
      id: 2,
      image: "https://images.pexels.com/photos/256468/pexels-photo-256468.jpeg?w=600&h=400&fit=crop",
      message: "Education is the most powerful weapon which you can use to change the world.",
      author: "Nelson Mandela",
      studentName: "Ama Serwaa",
      grade: "JHS 2",
      achievement: "Perfect Attendance"
    },
    {
      id: 3,
      image: "https://images.pexels.com/photos/256417/pexels-photo-256417.jpeg?w=600&h=400&fit=crop",
      message: "The beautiful thing about learning is that no one can take it away from you.",
      author: "B.B. King",
      studentName: "Yaw Asante",
      grade: "Primary 4",
      achievement: "Best Reader"
    },
    {
      id: 4,
      image: "https://images.pexels.com/photos/261909/pexels-photo-261909.jpeg?w=600&h=400&fit=crop",
      message: "Develop a passion for learning. If you do, you will never cease to grow.",
      author: "Anthony J. D'Angelo",
      studentName: "Efua Adjei",
      grade: "JHS 1",
      achievement: "Science Award"
    },
    {
      id: 5,
      image: "https://images.pexels.com/photos/256452/pexels-photo-256452.jpeg?w=600&h=400&fit=crop",
      message: "Success is not the key to happiness. Happiness is the key to success.",
      author: "Albert Schweitzer",
      studentName: "Kofi Boateng",
      grade: "Primary 5",
      achievement: "Most Disciplined"
    },
  ];

  // Check if logo exists
  useEffect(() => {
    const img = new Image();
    img.onload = () => setLogoExists(true);
    img.onerror = () => setLogoExists(false);
    img.src = geebzLogo;
  }, []);

  // Auto-slide every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % carouselItems.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [carouselItems.length]);

const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');


  try {
    const response = await apiFetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include', // Important for cookies
      body: JSON.stringify({ email, password })  // No selectedRole needed
    });

    const data = await response.json();
    console.log('Login response:', data);

    if (response.ok && data.success) {
      // Your backend returns: { success, accessToken, user, expiresIn }
      if (!data.accessToken) {
        setError('Login succeeded but no access token was returned.');
        setLoading(false);
        return;
      }

      // Use AuthContext login method
      login(data.user, data.accessToken);
      
      // The redirect will happen automatically in App.jsx based on user.role
    } else {
      setError(data.error || 'Invalid email or password');
    }
  } catch (err) {
    console.error('Login error:', err);
    setError('Network error. Please check your connection and try again.');
  } finally {
    setLoading(false);
  }
};

  const goToSlide = (index) => {
    setCurrentSlide(index);
  };

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % carouselItems.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + carouselItems.length) % carouselItems.length);
  };

  return (
    <div className="login-wrapper">
      <div className="login-container">
        {/* Login Form Section - Left Side */}
        <div className="login-section">
          <div className="login-card">
            <div className="login-header">
              <div className="login-logo">
                {logoExists ? (
                  <img src={geebzLogo} alt="Geebz Logo" />
                ) : (
                  <i className="fas fa-school"></i>
                )}
              </div>
              <h1>Welcome Back</h1>
              <p>Sign in to access your dashboard</p>
            </div>

            {error && (
              <div className="login-error">
                <i className="fas fa-exclamation-circle"></i> {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>
                  <i className="fas fa-envelope"></i> Email Address
                </label>
                <div className="input-with-icon">
                  <i className="fas fa-envelope"></i>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email address"
                    required
                    autoFocus
                  />
                </div>
              </div>

              <div className="form-group">
                <label>
                  <i className="fas fa-lock"></i> Password
                </label>
                <div className="input-with-icon">
                  <i className="fas fa-key"></i>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <i className="fas fa-eye-slash"></i> : <i className="fas fa-eye"></i>}
                  </button>
                </div>
              </div>


              <button type="submit" disabled={loading} className="login-btn">
                {loading ? (
                  <>
                    <i className="fas fa-spinner fa-pulse"></i> Logging in...
                  </>
                ) : (
                  <>
                    <i className="fas fa-sign-in-alt"></i> Sign In
                  </>
                )}
              </button>
            </form>

            <div className="login-footer">
          
            </div>
          </div>
        </div>

        {/* Carousel Section - Right Side */}
        <div className="carousel-section">
          <div className="carousel-container">
            <button className="carousel-nav prev" onClick={prevSlide}>
              <i className="fas fa-chevron-left"></i>
            </button>
            
            <div className="carousel-slide">
              <div className="carousel-image">
                <img 
                  src={carouselItems[currentSlide].image} 
                  alt={`Student - ${carouselItems[currentSlide].studentName}`}
                  onError={(e) => {
                    e.target.src = "https://images.pexels.com/photos/12098644/pexels-photo-12098644.jpeg?w=600&h=400&fit=crop";
                  }}
                />
                <div className="carousel-overlay"></div>
              </div>
              <div className="carousel-content">
                <div className="quote-icon">
                  <i className="fas fa-quote-left"></i>
                </div>
                <p className="carousel-message">"{carouselItems[currentSlide].message}"</p>
                <p className="carousel-author">- {carouselItems[currentSlide].author}</p>
                
                <div className="student-info">
                  <div className="student-details">
                    <i className="fas fa-user-graduate"></i>
                    <span className="student-name">{carouselItems[currentSlide].studentName}</span>
                  </div>
                  <div className="student-details">
                    <i className="fas fa-chalkboard"></i>
                    <span>{carouselItems[currentSlide].grade}</span>
                  </div>
                  <div className="student-achievement">
                    <i className="fas fa-trophy"></i>
                    <span>{carouselItems[currentSlide].achievement}</span>
                  </div>
                </div>
              </div>
            </div>

            <button className="carousel-nav next" onClick={nextSlide}>
              <i className="fas fa-chevron-right"></i>
            </button>

            <div className="carousel-dots">
              {carouselItems.map((_, index) => (
                <button
                  key={index}
                  className={`dot ${currentSlide === index ? 'active' : ''}`}
                  onClick={() => goToSlide(index)}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
