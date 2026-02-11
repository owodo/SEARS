import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

export default function Profile() {
  const { profile, updateProfile } = useAuth();
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(profile?.profile_image || null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setImageFile(file);
    if (file) {
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleUpload = async () => {
    if (!imageFile || !profile) return;
    setUploading(true);
    const fileExt = imageFile.name.split('.').pop();
    const fileName = `${profile.id}.${fileExt}`;
    const { data, error } = await supabase.storage.from('profile-images').upload(fileName, imageFile, {
      upsert: true,
    });
    if (error) {
      alert('Upload failed');
      setUploading(false);
      return;
    }
    const imageUrl = supabase.storage.from('profile-images').getPublicUrl(fileName).publicUrl;
    await updateProfile({ profile_image: imageUrl });
    setPreviewUrl(imageUrl);
    setUploading(false);
  };

  const initials = profile ? `${profile.first_name[0] || ''}${profile.last_name[0] || ''}`.toUpperCase() : '';

  return (
    <div className="max-w-xl mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center space-x-4">
            <Avatar>
              {previewUrl ? (
                <AvatarImage src={previewUrl} alt="Profile" />
              ) : (
                <AvatarFallback>{initials}</AvatarFallback>
              )}
            </Avatar>
            <div>
              <input type="file" accept="image/*" onChange={handleFileChange} />
              <Button onClick={handleUpload} disabled={!imageFile || uploading} className="ml-2">
                {uploading ? 'Uploading...' : 'Upload Image'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
