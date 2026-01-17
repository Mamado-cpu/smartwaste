import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '@/lib/api';
import { toast } from 'sonner';

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const [newPassword, setNewPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = searchParams.get('token');
    if (!token) {
      toast.error('Invalid or missing token');
      return;
    }

    try {
      await api.post('/auth/password-reset/reset', { token, newPassword });
      toast.success('Password reset successful');
    } catch (error: any) {
      console.error('Failed to reset password', error);
      toast.error(error.response?.data?.message || 'Failed to reset password');
    }
  };

  return (
    <div className="reset-password">
      <h1>Reset Password</h1>
      <form onSubmit={handleSubmit}>
        <label htmlFor="newPassword">New Password</label>
        <input
          type="password"
          id="newPassword"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
        />
        <button type="submit">Reset Password</button>
      </form>
    </div>
  );
};

export default ResetPassword;