import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { DashboardHome } from '@/components/dashboard/DashboardHome';
import { useAuth } from '@/hooks/useAuth';

const Dashboard = () => {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
    const currentYear = new Date().getFullYear();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    } else if (!loading && profile?.role === 'lab_owner') {
      navigate('/dashboard/lab-owner');
    }
  }, [user, profile, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-subtle">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user || !profile) {
    return null;
  }

  return (
    <DashboardLayout>
      <DashboardHome />
    </DashboardLayout>
  );
};

export default Dashboard;