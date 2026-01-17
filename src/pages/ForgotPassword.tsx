import React, { useState } from 'react';
import api from '@/lib/api';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/auth/password-reset/request', { email });
      toast.success('Password reset email sent. Please check your inbox.');
      navigate('/reset-password-with-code', { state: { email } }); // Navigate to reset page
    } catch (error: any) {
      console.error('Failed to send password reset email', error);
      toast.error(error.response?.data?.message || 'Failed to send password reset email');
    }
  };

  return (
    <div className="forgot-password">
      <h1>Forgot Password</h1>
      <form onSubmit={handleSubmit}>
        <label htmlFor="email">Email Address</label>
        <input
          type="email"
          id="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <button type="submit">Send Reset Link</button>
      </form>
      <p>
        If you already have a reset code,{' '}
        <button onClick={() => navigate('/reset-password-with-code')}>click here</button> to reset your password.
      </p>
    </div>
  );
};

export default ForgotPassword;