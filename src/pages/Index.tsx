import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { HeroSection } from '@/components/ui/hero-section';
import { useAuth } from '@/hooks/useAuth';
import { 
  Beaker, 
  Shield, 
  Users, 
  Database, 
  FileText, 
  BarChart3,
  Microscope,
  FlaskConical
} from 'lucide-react';

const Index = () => {
  const currentYear = new Date().getFullYear();
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && !loading) {
      navigate('/dashboard');
    }
  }, [user, loading, navigate]);

  const features = [
    {
      icon: Shield,
      title: 'Secure Portal',
      description: 'Multi-tier authentication with Universal Owner, Lab Owners, and Scientists access levels.'
    },
    {
      icon: FlaskConical,
      title: 'Experiment Management',
      description: 'Complete experiment lifecycle from creation to publication with metadata tracking.'
    },
    {
      icon: Database,
      title: 'Data Storage',
      description: 'Secure file storage with upload limits and comprehensive data management.'
    },
    {
      icon: BarChart3,
      title: 'Data Visualization',
      description: 'Automatic X-Y plotting for CSV files with interactive visualization tools.'
    },
    {
      icon: Users,
      title: 'Lab Collaboration',
      description: 'Built-in messaging system and team management for seamless lab coordination.'
    },
    {
      icon: Microscope,
      title: 'Scientific Workflows',
      description: 'Specialized tools for UV-VIS, GIWAXS, conductivity, and other material science measurements.'
    }
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-subtle">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <HeroSection
        title={<span>SEARS<sup className="text-base align-super">v3</sup></span>}
        subtitle={<span>Secure portal for managing material science experiments across multiple laboratories. Store, analyze, and collaborate on your research data with confidence.</span>}
      >
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button 
            size="lg" 
            className="bg-gradient-primary hover:shadow-glow transition-bounce text-lg px-8 py-3"
            onClick={() => navigate('/auth')}
          >
            <span className="flex items-center">
              <img
                src="/searsv2-logo.svg"
                alt="SEARSv2 Logo"
                className="w-6 h-6 mr-2 inline-block align-middle"
                style={{ verticalAlign: 'middle' }}
              />
              <span className="text-lg font-bold text-scientific-navy">SEARS</span>
            </span>
            Access Portal
          </Button>
          {/* Learn More button removed as requested */}
        </div>
      </HeroSection>

      {/* Features Section */}
      <section className="py-16 px-6 max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-scientific-navy mb-4">
            Advanced Research Management
          </h2>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
            Built specifically for material science laboratories, SEARS<sup className="text-base align-super">v3</sup> provides comprehensive 
            experiment management with secure data storage and powerful collaboration tools.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <Card key={index} className="shadow-card hover:shadow-elegant transition-smooth">
              <CardHeader>
                <div className="w-12 h-12 bg-gradient-accent rounded-lg flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-accent-foreground" />
                </div>
                <CardTitle className="text-xl">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">
                  {feature.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-6 bg-gradient-accent">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-accent-foreground mb-4">
            Ready to Transform Your Lab?
          </h2>
          <p className="text-lg text-accent-foreground/90 mb-8">
            Join laboratories worldwide using SEARS<sup className="text-base align-super">v3</sup> to streamline their research workflows 
            and accelerate scientific discovery.
          </p>
          <Button 
            size="lg" 
            variant="secondary"
            className="text-lg px-8 py-3 hover:shadow-glow transition-bounce"
            onClick={() => navigate('/auth')}
          >
            <Beaker className="w-5 h-5 mr-2" />
            Get Started Today
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-border">
        <div className="max-w-7xl mx-auto text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
              <Beaker className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-scientific-navy">SEARS<sup className="text-base align-super">v3</sup></span>
          </div>
          <p className="text-muted-foreground">
            Secure material science experiment management platform
          </p>
          <div className="w-full text-center py-4">
            <img src="/watermark-logo.png" alt="Watermark Logo" className="mx-auto mb-2 h-20 opacity-60" />
            <div className="text-muted-foreground text-sm border-t pt-4">
              &copy; Iowa State University {currentYear}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
