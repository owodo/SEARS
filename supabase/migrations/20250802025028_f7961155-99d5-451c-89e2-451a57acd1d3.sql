-- Fix missing RLS policies for measurements, experiment_files, and messages tables

-- RLS Policies for measurements
CREATE POLICY "Lab members can view measurements" ON public.measurements
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.measurement_sections ms
      JOIN public.experiments e ON ms.experiment_id = e.id
      WHERE ms.id = section_id AND e.lab_id = public.get_user_lab_id()
    )
  );

CREATE POLICY "Scientists can create measurements" ON public.measurements
  FOR INSERT WITH CHECK (
    public.get_user_role() = 'scientist' AND
    scientist_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Scientists can update their own measurements" ON public.measurements
  FOR UPDATE USING (scientist_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

-- RLS Policies for experiment_files
CREATE POLICY "Lab members can view experiment files" ON public.experiment_files
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.measurement_sections ms
      JOIN public.experiments e ON ms.experiment_id = e.id
      WHERE ms.id = section_id AND e.lab_id = public.get_user_lab_id()
    )
  );

CREATE POLICY "Scientists can upload experiment files" ON public.experiment_files
  FOR INSERT WITH CHECK (
    public.get_user_role() = 'scientist' AND
    scientist_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  );

-- RLS Policies for messages
CREATE POLICY "Lab members can view lab messages" ON public.messages
  FOR SELECT USING (lab_id = public.get_user_lab_id());

CREATE POLICY "Lab members can send messages" ON public.messages
  FOR INSERT WITH CHECK (
    lab_id = public.get_user_lab_id() AND
    sender_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  );

-- Fix function search path issues
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.get_user_lab_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT lab_id FROM public.profiles WHERE user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;