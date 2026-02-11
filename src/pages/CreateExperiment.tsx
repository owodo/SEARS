import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ExperimentForm } from '@/components/experiments/ExperimentForm';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';

export const CreateExperiment = () => {
  const navigate = useNavigate();

  const handleSuccess = () => {
    navigate('/dashboard');
  };

  return (
    <DashboardLayout>
      <ExperimentForm onSuccess={handleSuccess} />
    </DashboardLayout>
  );
};