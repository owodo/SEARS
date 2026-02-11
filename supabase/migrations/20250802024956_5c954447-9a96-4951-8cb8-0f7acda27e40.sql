-- Create user roles enum
CREATE TYPE public.user_role AS ENUM ('universal_owner', 'lab_owner', 'scientist');

-- Create labs table
CREATE TABLE public.labs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'scientist',
  lab_id UUID REFERENCES public.labs(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create experiments table
CREATE TABLE public.experiments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lab_id UUID NOT NULL REFERENCES public.labs(id) ON DELETE CASCADE,
  scientist_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  metadata JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'approved', 'rejected', 'published')),
  approved_by UUID REFERENCES public.profiles(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  marked_for_publication BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create measurement_sections table for different types of measurements
CREATE TABLE public.measurement_sections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  experiment_id UUID NOT NULL REFERENCES public.experiments(id) ON DELETE CASCADE,
  section_type TEXT NOT NULL CHECK (section_type IN ('thickness', 'uv_vis_nir', 'giwaxs', 'conductivity', 'skpm', 'iv', 'profilometry', 'mobility')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create measurements table for numerical data
CREATE TABLE public.measurements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  section_id UUID NOT NULL REFERENCES public.measurement_sections(id) ON DELETE CASCADE,
  batch_number TEXT NOT NULL,
  reading_number TEXT NOT NULL,
  value DECIMAL,
  unit TEXT,
  scientist_id UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create files table for uploaded files
CREATE TABLE public.experiment_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  section_id UUID NOT NULL REFERENCES public.measurement_sections(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  mime_type TEXT,
  scientist_id UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create messages table for lab communication
CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lab_id UUID NOT NULL REFERENCES public.labs(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.labs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.experiments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.measurement_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.measurements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.experiment_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Create function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT role FROM public.profiles WHERE user_id = auth.uid();
$$;

-- Create function to get user lab_id
CREATE OR REPLACE FUNCTION public.get_user_lab_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT lab_id FROM public.profiles WHERE user_id = auth.uid();
$$;

-- RLS Policies for labs
CREATE POLICY "Universal owners can view all labs" ON public.labs
  FOR SELECT USING (public.get_user_role() = 'universal_owner');

CREATE POLICY "Lab owners can view their lab" ON public.labs
  FOR SELECT USING (
    public.get_user_role() = 'lab_owner' AND 
    id = public.get_user_lab_id()
  );

CREATE POLICY "Scientists can view their lab" ON public.labs
  FOR SELECT USING (
    public.get_user_role() = 'scientist' AND 
    id = public.get_user_lab_id()
  );

CREATE POLICY "Universal owners can insert labs" ON public.labs
  FOR INSERT WITH CHECK (public.get_user_role() = 'universal_owner');

CREATE POLICY "Universal owners can update labs" ON public.labs
  FOR UPDATE USING (public.get_user_role() = 'universal_owner');

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Universal owners can view all profiles" ON public.profiles
  FOR SELECT USING (public.get_user_role() = 'universal_owner');

CREATE POLICY "Lab owners can view lab members" ON public.profiles
  FOR SELECT USING (
    public.get_user_role() = 'lab_owner' AND 
    lab_id = public.get_user_lab_id()
  );

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Universal owners can insert profiles" ON public.profiles
  FOR INSERT WITH CHECK (public.get_user_role() = 'universal_owner');

CREATE POLICY "Lab owners can insert scientists" ON public.profiles
  FOR INSERT WITH CHECK (
    public.get_user_role() = 'lab_owner' AND 
    role = 'scientist' AND 
    lab_id = public.get_user_lab_id()
  );

-- RLS Policies for experiments
CREATE POLICY "Lab members can view lab experiments" ON public.experiments
  FOR SELECT USING (lab_id = public.get_user_lab_id());

CREATE POLICY "Universal owners can view all experiments" ON public.experiments
  FOR SELECT USING (public.get_user_role() = 'universal_owner');

CREATE POLICY "Scientists can create experiments" ON public.experiments
  FOR INSERT WITH CHECK (
    public.get_user_role() = 'scientist' AND 
    lab_id = public.get_user_lab_id() AND
    scientist_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Lab owners can update experiments" ON public.experiments
  FOR UPDATE USING (
    public.get_user_role() = 'lab_owner' AND 
    lab_id = public.get_user_lab_id()
  );

CREATE POLICY "Scientists can update their own experiments" ON public.experiments
  FOR UPDATE USING (
    public.get_user_role() = 'scientist' AND 
    scientist_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  );

-- Similar policies for other tables...
CREATE POLICY "Lab members can view measurements" ON public.measurement_sections
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.experiments 
      WHERE id = experiment_id AND lab_id = public.get_user_lab_id()
    )
  );

CREATE POLICY "Scientists can create measurements" ON public.measurement_sections
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.experiments 
      WHERE id = experiment_id AND scientist_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    )
  );

-- Create storage bucket for experiment files
INSERT INTO storage.buckets (id, name, public) VALUES ('experiment-files', 'experiment-files', false);

-- Storage policies
CREATE POLICY "Lab members can view experiment files" ON storage.objects
  FOR SELECT USING (bucket_id = 'experiment-files' AND auth.role() = 'authenticated');

CREATE POLICY "Scientists can upload experiment files" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'experiment-files' AND auth.role() = 'authenticated');

-- Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_labs_updated_at BEFORE UPDATE ON public.labs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_experiments_updated_at BEFORE UPDATE ON public.experiments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default Universal Owner (will need to be claimed by setting password)
INSERT INTO public.labs (name, description) VALUES ('System Administration', 'Universal Owner Lab');

-- Get the lab ID for the system administration lab
DO $$
DECLARE
  admin_lab_id UUID;
BEGIN
  SELECT id INTO admin_lab_id FROM public.labs WHERE name = 'System Administration';
  
  -- Insert a default universal owner profile (user will need to sign up with this email)
  INSERT INTO public.profiles (user_id, email, first_name, last_name, role, lab_id)
  VALUES (
    '00000000-0000-0000-0000-000000000000'::UUID, 
    'admin@labforge.com', 
    'System', 
    'Administrator', 
    'universal_owner', 
    admin_lab_id
  );
END $$;