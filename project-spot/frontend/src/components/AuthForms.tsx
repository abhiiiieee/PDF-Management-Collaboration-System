import React, { useState, useEffect } from 'react';
import { Box, Button, TextField, Typography, Paper, Alert } from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';

interface AuthFormsProps {
  initialMode?: 'login' | 'register';
}

interface LocationState {
  resetSuccess?: boolean;
}

const AuthForms: React.FC<AuthFormsProps> = ({ initialMode = 'login' }) => {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState(false);
  
  const { login, register, error: authError, isLoading, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Check for reset success message
  useEffect(() => {
    const state = location.state as LocationState;
    if (state?.resetSuccess) {
      setResetSuccess(true);
    }
  }, [location]);
  
  // Redirect if user is already authenticated
  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    
    if (mode === 'register') {
      if (password !== confirmPassword) {
        setLocalError('Passwords do not match');
        return;
      }
      
      try {
        await register(name, email, password);
        navigate('/');
      } catch (error) {
        // Error is handled in AuthContext
      }
    } else {
      try {
        await login(email, password);
        navigate('/');
      } catch (error) {
        // Error is handled in AuthContext
      }
    }
  };

  const toggleMode = () => {
    setMode(mode === 'login' ? 'register' : 'login');
    setLocalError(null);
  };

  return (
    <Paper elevation={3}>
      <Box p={3} component="form" onSubmit={handleSubmit}>
        <Typography variant="h5" component="h1" align="center" gutterBottom>
          {mode === 'login' ? 'Login' : 'Register'}
        </Typography>
        
        {resetSuccess && (
          <Alert severity="success" sx={{ mb: 2 }}>
            Password reset successful! You can now login with your new password.
          </Alert>
        )}
        
        {(localError || authError) && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {localError || authError}
          </Alert>
        )}
        
        {mode === 'register' && (
          <TextField
            label="Full Name"
            type="text"
            fullWidth
            margin="normal"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        )}
        
        <TextField
          label="Email"
          type="email"
          fullWidth
          margin="normal"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        
        <TextField
          label="Password"
          type="password"
          fullWidth
          margin="normal"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        
        {mode === 'register' && (
          <TextField
            label="Confirm Password"
            type="password"
            fullWidth
            margin="normal"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
        )}
        
        <Button
          type="submit"
          variant="contained"
          color="primary"
          fullWidth
          sx={{ mt: 2 }}
          disabled={isLoading}
        >
          {isLoading ? 'Processing...' : mode === 'login' ? 'Login' : 'Register'}
        </Button>
        
        {mode === 'login' && (
          <Box mt={1} textAlign="center">
            <Button color="primary" href="/forgot-password" size="small">
              Forgot password?
            </Button>
          </Box>
        )}
        
        <Box mt={2} textAlign="center">
          <Typography variant="body2">
            {mode === 'login' ? "Don't have an account?" : "Already have an account?"}
            <Button color="primary" onClick={toggleMode} sx={{ ml: 1 }}>
              {mode === 'login' ? 'Register' : 'Login'}
            </Button>
          </Typography>
        </Box>
      </Box>
    </Paper>
  );
};

export default AuthForms; 