import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { KeyRound, Eye, EyeOff } from 'lucide-react';

export default function Profile() {
  const { profile, updateProfile } = useAuth();

  // Profile image
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(profile?.profile_image || null);

  // Password change
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setImageFile(file);
    if (file) setPreviewUrl(URL.createObjectURL(file));
  };

  const handleUpload = async () => {
    if (!imageFile || !profile) return;
    setUploading(true);
    try {
      const fileExt = imageFile.name.split('.').pop();
      const fileName = `${profile.id}.${fileExt}`;
      const { error } = await supabase.storage
        .from('profile-images')
        .upload(fileName, imageFile, { upsert: true });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from('profile-images').getPublicUrl(fileName);
      const imageUrl = urlData.publicUrl;
      await updateProfile({ profile_image: imageUrl });
      setPreviewUrl(imageUrl);
      toast.success('Profile image updated');
    } catch (err: any) {
      console.error('Image upload failed:', err);
      toast.error(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleChangePassword = async () => {
    // Validation
    if (!newPassword || !confirmPassword) {
      toast.error('Please fill in both password fields');
      return;
    }
    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (newPassword === 'TempPassword123!') {
      toast.error('Please choose a password different from the temporary one');
      return;
    }

    setChangingPassword(true);
    try {
      // Updates the password for the currently logged-in user.
      // No email needed — the user is already authenticated.
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      toast.success('Password changed successfully');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      console.error('Password change failed:', err);
      toast.error(err.message || 'Failed to change password');
    } finally {
      setChangingPassword(false);
    }
  };

  const initials = profile
    ? `${profile.first_name?.[0] || ''}${profile.last_name?.[0] || ''}`.toUpperCase()
    : '';

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Profile info */}
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>Your account details and photo.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center space-x-4">
              <Avatar className="h-16 w-16">
                {previewUrl ? (
                  <AvatarImage src={previewUrl} alt="Profile" />
                ) : (
                  <AvatarFallback className="text-lg">{initials}</AvatarFallback>
                )}
              </Avatar>
              <div className="flex items-center gap-2">
                <input type="file" accept="image/*" onChange={handleFileChange} />
                <Button onClick={handleUpload} disabled={!imageFile || uploading}>
                  {uploading ? 'Uploading...' : 'Upload Image'}
                </Button>
              </div>
            </div>
            {profile && (
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-medium text-muted-foreground">Name</p>
                  <p>{profile.first_name} {profile.last_name}</p>
                </div>
                <div>
                  <p className="font-medium text-muted-foreground">Email</p>
                  <p>{profile.email}</p>
                </div>
                <div>
                  <p className="font-medium text-muted-foreground">Role</p>
                  <p className="capitalize">{profile.role?.replace('_', ' ')}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Change password */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-primary" />
              Change Password
            </CardTitle>
            <CardDescription>
              If you're still using the temporary password (TempPassword123!),
              set your own password here.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="newPassword">New Password</Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="At least 8 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input
                id="confirmPassword"
                type={showPassword ? 'text' : 'password'}
                placeholder="Re-enter your new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
            <Button onClick={handleChangePassword} disabled={changingPassword}>
              {changingPassword ? 'Updating...' : 'Update Password'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
