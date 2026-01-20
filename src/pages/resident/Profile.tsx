import React, { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const Profile: React.FC = () => {
  const [profile, setProfile] = useState({
    fullName: '',
    email: '',
    phone: '',
    
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        // use the configured api instance so baseURL and Authorization are applied
        const response = await api.get('/auth/me');
        console.log('Profile data fetched:', response.data);
        setProfile(response.data || {});
      } catch (err) {
        console.error('Error fetching profile:', err);
        setError('Failed to fetch profile');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  
  if (loading) {
    return <div className="text-center">Loading profile...</div>;
  }

  if (error) {
    return <div className="text-center text-red-500">{error}</div>;
  }

  return (
    <div className="max-w-md mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">My Profile</h1>
      {error && <p className="text-red-500 mb-4">{error}</p>}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Full Name</label>
        <Input type="text" value={profile.fullName || 'N/A'} readOnly />
      </div>
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Email</label>
        <Input type="email" value={profile.email || 'N/A'} readOnly />
      </div>
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Phone</label>
        <Input type="text" value={profile.phone || 'N/A'} readOnly />
      </div>
      
      <Button onClick={() => window.location.reload()} disabled={loading}>
        {loading ? 'Refreshing...' : 'Refresh'}
      </Button>
    </div>
  );
};

export default Profile;