import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, Beaker } from 'lucide-react';

export const AuthForm = () => {
  const currentYear = new Date().getFullYear();
  const { signIn, signUp, loading, profile } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    confirmPassword: ''
  });

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const result = await signIn(formData.email, formData.password);
    setIsLoading(false);
    // Redirect lab owner to dashboard
    if (!result.error && profile?.role === 'lab_owner') {
      window.location.href = '/dashboard/lab-owner';
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      alert('Passwords do not match');
      return;
    }
    setIsLoading(true);
    await signUp(formData.email, formData.password, formData.firstName, formData.lastName);
    setIsLoading(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-subtle px-4">
      <Card className="w-full max-w-md shadow-card">
        <CardHeader className="text-center">
          <div className="flex flex-col items-center mb-4">
            <img
              src="/searsv2-logo.svg"
              alt="SEARSv2 Logo"
              className="w-12 h-12 mb-1"
              style={{ display: 'block' }}
            />
            <span className="text-xl font-bold text-scientific-navy">SEARS</span>
          </div>
          <CardTitle className="text-2xl font-bold text-scientific-navy">SEARS<sup className="text-base align-super">v2</sup></CardTitle>
          <CardDescription>
            Secure portal for material science research
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>
            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="scientist@university.edu"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    className="transition-smooth focus:shadow-glow"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    required
                    className="transition-smooth focus:shadow-glow"
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full bg-gradient-primary hover:shadow-glow transition-bounce" 
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing In...
                    </>
                  ) : (
                    'Sign In'
                  )}
                </Button>
              </form>
            </TabsContent>
            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      name="firstName"
                      type="text"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      required
                      className="transition-smooth focus:shadow-glow"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      name="lastName"
                      type="text"
                      value={formData.lastName}
                      onChange={handleInputChange}
                      required
                      className="transition-smooth focus:shadow-glow"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    name="email"
                    type="email"
                    placeholder="scientist@university.edu"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    className="transition-smooth focus:shadow-glow"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <Input
                    id="signup-password"
                    name="password"
                    type="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    required
                    className="transition-smooth focus:shadow-glow"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    required
                    className="transition-smooth focus:shadow-glow"
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full bg-gradient-accent hover:shadow-glow transition-bounce" 
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating Account...
                    </>
                  ) : (
                    'Sign Up'
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
          {/* Removed hardcoded default admin message */}
        </CardContent>
      </Card>
      <footer className="w-full text-center py-4 text-muted-foreground text-sm border-t mt-8">
  <img src="/watermark-logo.png" alt="SEARSv2 Logo (SEARSv2)" className="mx-auto mb-2 h-16 opacity-90" />
        &copy; Iowa State University {currentYear}
      </footer>
    </div>
  );
}