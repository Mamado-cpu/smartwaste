import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import api from '@/lib/api';
import { useNavigate } from 'react-router-dom';
import { 
  initializeMockData, 
  getMockUsers, 
  setMockUsers, 
  getCurrentUser, 
  setCurrentUser,
  MockUser 
} from '@/lib/mockData';

interface AuthContextType {
  user: MockUser | null;
  session: any | null;
  userRole: string | null;
  isApproved: boolean;
  loading: boolean;
  signUp:
   (username: string,
    email: string, 
    password: string, 
    fullName: string, 
    phone: string, 
    twoFactorEnabled?: boolean, 
    twoFactorMethod?: string,
    role?: string,
    vehicleNumber?: string,
    vehicleType?: string
  ) => Promise<{ error: any }>;
  signIn: (email: string, password: string, roleHint: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<MockUser | null>(null);
  const [session, setSession] = useState<any | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isApproved, setIsApproved] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Initialize mock data
    initializeMockData();
    
    // Check for existing session
    const token = localStorage.getItem('auth_token');
      if (token) {
      // try to load user from backend
      api.get('/auth/me')
        .then((res) => {
          const u = res.data;
          setUser(u);
          setCurrentUser(u as any);
          setSession({ user: u });
          const chooseRole = (roles: string[] | undefined | null) => {
            if (!roles || !roles.length) return null;
            if (roles.includes('admin')) return 'admin';
            if (roles.includes('collector')) return 'collector';
            if (roles.includes('resident')) return 'resident';
            return roles[0] || null;
          };
          setUserRole(chooseRole(u.roles));
          setIsApproved(u.isApproved || false);
          // Navigate to dashboard based on role
          const role = chooseRole(u.roles);
          if (role === 'admin') navigate('/admin');
          else if (role === 'collector') navigate('/collector');
          else if (role === 'resident') navigate('/resident');
          else navigate('/');
        })
        .catch(() => {
          // fallback to mock current user
          const currentUser = getCurrentUser();
          if (currentUser) {
            setUser(currentUser);
            setSession({ user: currentUser });
            setUserRole(currentUser.role || null);
            setIsApproved(currentUser.isApproved);
            // Navigate to dashboard
            const role = currentUser.role;
            if (role === 'admin') navigate('/admin');
            else if (role === 'collector') navigate('/collector');
            else if (role === 'resident') navigate('/resident');
            else navigate('/');
          }
        });
    } else {
      const currentUser = getCurrentUser();
      if (currentUser) {
        setUser(currentUser);
        setSession({ user: currentUser });
          setUserRole(currentUser.role || null);
        setIsApproved(currentUser.isApproved);
      }
    }
    setLoading(false);
  }, []);

  const signUp = async (username: string, email: string, password: string, fullName: string, phone: string, twoFactorEnabled = false, twoFactorMethod?: string, role?: string, vehicleNumber?: string, vehicleType?: string) => {
    try {
      const payload: any = { 
        username, 
        email, 
        password, 
        fullName, 
        phone ,
        role
      };
      if (role) payload.role = role;
      if (vehicleNumber) payload.vehicleNumber = vehicleNumber;
      if (vehicleType) payload.vehicleType = vehicleType;
      if (twoFactorEnabled) payload.twoFactorEnabled = true;
      if (twoFactorMethod) payload.twoFactorMethod = twoFactorMethod;
      const res = await api.post('/auth/register', payload);
      // If backend requires 2FA, return that info to the caller
      if (res.data?.twoFactorRequired) {
        return { error: null, twoFactorRequired: true, tempToken: res.data.tempToken };
      }
      // backend returns token and user
        if (res.data?.token) {
        localStorage.setItem('auth_token', res.data.token);
        const u = res.data.user;
        setUser(u);
          setCurrentUser(u as any);
        setSession({ user: u });
        const chooseRole = (roles: string[] | undefined | null) => {
          if (!roles || !roles.length) return null;
          if (roles.includes('admin')) return 'admin';
          if (roles.includes('collector')) return 'collector';
          if (roles.includes('resident')) return 'resident';
          return roles[0] || null;
        };
        setUserRole(chooseRole(u.roles));
        setIsApproved(u.isApproved || false);
      }
      return { error: null };
    } catch (err: any) {
      return { error: { message: err.response?.data?.message || err.message } };
    }
  };

  const signIn = async (email: string, password: string, roleHint: string) => {
    try {
      console.log('API URL being used:', api.defaults.baseURL); // Debugging log to verify baseURL
      console.log('Request Payload:', { email, password, roleHint }); // Debugging log to verify request payload
      const res = await api.post('/auth/login', { email, password, roleHint }); // Include roleHint in the request
      console.log('Server Response:', res); // Debugging log
      const user = res.data;

      console.log('Role Hint:', roleHint); // Debugging log
      console.log('User Roles:', user.roles); // Debugging log
      console.log('Full User Object:', user); // Debugging log

      const userRoles = user.user?.roles; // Correctly access roles from the nested user object
      console.log('Corrected User Roles:', userRoles); // Debugging log

      if (!userRoles || !Array.isArray(userRoles)) {
        console.error('Invalid roles:', userRoles); // Debugging log
        return { error: { message: 'User roles are missing or invalid.' } };
      }

      if (!userRoles.includes(roleHint)) {
        return { error: { message: 'Access denied. Role mismatch.' } };
      }

      setUser(user);
      setSession({ user });
      setUserRole(roleHint);
      setIsApproved(user.isApproved || false);
      localStorage.setItem('auth_token', user.token);

      return { error: null };
    } catch (err) {
      console.error('Login Error:', err.response?.data || err); // Debugging log
      return { error: err.response?.data || { message: 'Login failed' } };
    }
  };

  const signInWrapper = async (email: string, password: string, role?: string | null) => signIn(email, password, role);

  const signOut = async () => {
    setUser(null);
    setSession(null);
    setUserRole(null);
    setIsApproved(false);
    setCurrentUser(null);
    localStorage.removeItem('auth_token');
    navigate('/');
  };

  return (
    <AuthContext.Provider value={{ user, session, userRole, isApproved, loading, signUp, signIn: signInWrapper, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
