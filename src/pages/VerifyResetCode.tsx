import React, { useState } from 'react';
import api from '@/lib/api';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

const VerifyResetCode = () => {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/auth/password-reset/verify', { email, code });
      toast.success('Code verified! You can now reset your password.');
      navigate('/reset-password', { state: { email } });
    } catch (error: any) {
      console.error('Failed to verify code', error);
      toast.error(error.response?.data?.message || 'Failed to verify code');
    }
  };

  return (
    <div className="verify-reset-code">
      <h1>Verify Reset Code</h1>
      <form onSubmit={handleSubmit}>
        <label htmlFor="email">Email Address</label>
        <input
          type="email"
          id="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <label htmlFor="code">Verification Code</label>
        <input
          type="text"
          id="code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          required
        />
        <button type="submit">Verify Code</button>
      </form>
    </div>
  );
};

export default VerifyResetCode;