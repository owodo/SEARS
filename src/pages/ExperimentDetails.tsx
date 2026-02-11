import React from 'react';
import { useParams } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { ExperimentForm } from '@/components/experiments/ExperimentForm';

const ExperimentDetails = () => {
  const { id } = useParams<{ id: string }>();
    const currentYear = new Date().getFullYear();
  return (
    <DashboardLayout>
  <ExperimentForm experimentId={id || undefined} />
    </DashboardLayout>
  );
    <footer className="w-full text-center py-4 text-muted-foreground text-sm border-t mt-8">
      &copy; Iowa State University {currentYear}
    </footer>
};

export default ExperimentDetails;
