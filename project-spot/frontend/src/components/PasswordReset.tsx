import React, { useState } from 'react';
import { 
  Box, 
  Typography, 
  TextField, 
  Button, 
  Paper, 
  Alert, 
  Snackbar 
} from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import { authService } from '../services/api';

// Component to request password reset
export const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  const [devModeResetUrl, setDevModeResetUrl] = useState<string | null>(null);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setDevModeResetUrl(null);
    
    try {
      const response = await authService.forgotPassword(email);
      
      // Check if we're in development mode and received a direct reset URL
      if (response.resetUrl) {
        setDevModeResetUrl(response.resetUrl);
        setNotification({
          open: true,
          message: 'Password reset link generated (DEV MODE). Check below.',
          severity: 'success'
        });
      } else {
        setNotification({
          open: true,
          message: 'Password reset email sent. Please check your inbox.',
          severity: 'success'
        });
      }
      
      setEmail('');
    } catch (error: any) {
      console.error('Password reset error:', error);
      const errorMessage = error?.response?.data?.message || 
                          error?.response?.data?.error || 
                          error?.message || 
                          'Failed to request password reset';
      
      setError(errorMessage);
      
      // Show more detailed error for development/debugging
      if (process.env.NODE_ENV !== 'production') {
        console.error('Detailed error:', error?.response?.data);
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleCloseNotification = () => {
    setNotification(prev => ({ ...prev, open: false }));
  };
  
  return (
    <Paper elevation={3}>
      <Box p={3} component="form" onSubmit={handleSubmit}>
        <Typography variant="h5" component="h1" align="center" gutterBottom>
          Reset Your Password
        </Typography>
        
        <Typography variant="body1" align="center" sx={{ mb: 3 }}>
          Enter your email address and we'll send you a link to reset your password.
        </Typography>
        
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        {devModeResetUrl && (
          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="body2" gutterBottom>Dev Mode: Use this link to reset password</Typography>
            <Box 
              component="a" 
              href={devModeResetUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              sx={{ 
                wordBreak: 'break-all', 
                display: 'block',
                fontSize: '0.875rem'
              }}
            >
              {devModeResetUrl}
            </Box>
          </Alert>
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
        
        <Button
          type="submit"
          variant="contained"
          color="primary"
          fullWidth
          sx={{ mt: 2 }}
          disabled={isLoading}
        >
          {isLoading ? 'Sending...' : 'Send Reset Link'}
        </Button>
        
        <Box mt={2} textAlign="center">
          <Button color="primary" href="/login_user">
            Back to Login
          </Button>
        </Box>
      </Box>
      
      <Snackbar 
        open={notification.open} 
        autoHideDuration={6000} 
        onClose={handleCloseNotification}
      >
        <Alert onClose={handleCloseNotification} severity={notification.severity}>
          {notification.message}
        </Alert>
      </Snackbar>
    </Paper>
  );
};

// Component to reset password with token
export const ResetPassword: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      if (!token) {
        setError('Invalid reset link');
        return;
      }
      
      await authService.resetPassword(token, password);
      // Redirect to login with success message
      navigate('/login', { state: { resetSuccess: true } });
    } catch (error: any) {
      setError(error?.response?.data?.message || 'Failed to reset password');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <Paper elevation={3}>
      <Box p={3} component="form" onSubmit={handleSubmit}>
        <Typography variant="h5" component="h1" align="center" gutterBottom>
          Reset Your Password
        </Typography>
        
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        <TextField
          label="New Password"
          type="password"
          fullWidth
          margin="normal"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        
        <TextField
          label="Confirm New Password"
          type="password"
          fullWidth
          margin="normal"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
        />
        
        <Button
          type="submit"
          variant="contained"
          color="primary"
          fullWidth
          sx={{ mt: 2 }}
          disabled={isLoading}
        >
          {isLoading ? 'Resetting...' : 'Reset Password'}
        </Button>
        
        <Box mt={2} textAlign="center">
          <Button color="primary" href="/login_user">
            Back to Login
          </Button>
        </Box>
      </Box>
    </Paper>
  );
}; 