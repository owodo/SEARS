-- =============================================
-- Give lab_owner full INSERT/UPDATE/DELETE
-- on experiments, measurement_sections,
-- measurements, and experiment_files
-- within their own lab.
-- =============================================

-- 1. EXPERIMENTS — lab owners can CREATE
CREATE POLICY "Lab owners can create experiments"
ON public.experiments
FOR INSERT
WITH CHECK (
  public.get_user_role() = 'lab_owner'
  AND lab_id = public.get_user_lab_id()
  AND scientist_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
);

-- 2. MEASUREMENT_SECTIONS — lab owners can CREATE / UPDATE / DELETE
CREATE POLICY "Lab owners can create measurement sections"
ON public.measurement_sections
FOR INSERT
WITH CHECK (
  public.get_user_role() = 'lab_owner'
  AND EXISTS (
    SELECT 1 FROM public.experiments
    WHERE id = experiment_id
      AND lab_id = public.get_user_lab_id()
  )
);

CREATE POLICY "Lab owners can update measurement sections"
ON public.measurement_sections
FOR UPDATE
USING (
  public.get_user_role() = 'lab_owner'
  AND EXISTS (
    SELECT 1 FROM public.experiments
    WHERE id = experiment_id
      AND lab_id = public.get_user_lab_id()
  )
);

CREATE POLICY "Lab owners can delete measurement sections"
ON public.measurement_sections
FOR DELETE
USING (
  public.get_user_role() = 'lab_owner'
  AND EXISTS (
    SELECT 1 FROM public.experiments
    WHERE id = experiment_id
      AND lab_id = public.get_user_lab_id()
  )
);

-- 3. MEASUREMENTS — lab owners can CREATE / UPDATE / DELETE
CREATE POLICY "Lab owners can create measurements"
ON public.measurements
FOR INSERT
WITH CHECK (
  public.get_user_role() = 'lab_owner'
  AND EXISTS (
    SELECT 1
    FROM public.measurement_sections ms
    JOIN public.experiments e ON e.id = ms.experiment_id
    WHERE ms.id = section_id
      AND e.lab_id = public.get_user_lab_id()
  )
);

CREATE POLICY "Lab owners can update measurements"
ON public.measurements
FOR UPDATE
USING (
  public.get_user_role() = 'lab_owner'
  AND EXISTS (
    SELECT 1
    FROM public.measurement_sections ms
    JOIN public.experiments e ON e.id = ms.experiment_id
    WHERE ms.id = section_id
      AND e.lab_id = public.get_user_lab_id()
  )
);

CREATE POLICY "Lab owners can delete measurements"
ON public.measurements
FOR DELETE
USING (
  public.get_user_role() = 'lab_owner'
  AND EXISTS (
    SELECT 1
    FROM public.measurement_sections ms
    JOIN public.experiments e ON e.id = ms.experiment_id
    WHERE ms.id = section_id
      AND e.lab_id = public.get_user_lab_id()
  )
);

-- 4. EXPERIMENT_FILES — lab owners can UPLOAD / DELETE
CREATE POLICY "Lab owners can upload experiment files"
ON public.experiment_files
FOR INSERT
WITH CHECK (
  public.get_user_role() = 'lab_owner'
  AND EXISTS (
    SELECT 1
    FROM public.measurement_sections ms
    JOIN public.experiments e ON e.id = ms.experiment_id
    WHERE ms.id = section_id
      AND e.lab_id = public.get_user_lab_id()
  )
);

CREATE POLICY "Lab owners can delete experiment files"
ON public.experiment_files
FOR DELETE
USING (
  public.get_user_role() = 'lab_owner'
  AND EXISTS (
    SELECT 1
    FROM public.measurement_sections ms
    JOIN public.experiments e ON e.id = ms.experiment_id
    WHERE ms.id = section_id
      AND e.lab_id = public.get_user_lab_id()
  )
);
