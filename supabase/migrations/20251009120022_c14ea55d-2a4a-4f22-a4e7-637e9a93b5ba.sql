-- Create pages table to store all app pages
CREATE TABLE IF NOT EXISTS public.pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  route TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create page_access table to control role-based access
CREATE TABLE IF NOT EXISTS public.page_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID NOT NULL REFERENCES public.pages(id) ON DELETE CASCADE,
  role_name TEXT NOT NULL,
  has_access BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(page_id, role_name)
);

-- Enable RLS on both tables
ALTER TABLE public.pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.page_access ENABLE ROW LEVEL SECURITY;

-- RLS policies for pages table
CREATE POLICY "Anyone can view pages"
ON public.pages FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage pages"
ON public.pages FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- RLS policies for page_access table
CREATE POLICY "Anyone can view page access"
ON public.page_access FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage page access"
ON public.page_access FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Insert default pages from the app
INSERT INTO public.pages (name, description, route) VALUES
  ('Dashboard', 'Main dashboard with overview and stats', '/'),
  ('Skills', 'Manage and rate your skills', '/skills'),
  ('Skill Explorer', 'Explore skills across the organization', '/skill-explorer'),
  ('Projects', 'View and manage projects', '/projects'),
  ('Approvals', 'Review and approve skill ratings', '/approvals'),
  ('Reports', 'Generate and view reports', '/reports'),
  ('Admin', 'Administrative settings and user management', '/admin'),
  ('Profile', 'User profile settings', '/profile')
ON CONFLICT (route) DO NOTHING;

-- Insert default access for all roles on all pages
INSERT INTO public.page_access (page_id, role_name, has_access)
SELECT p.id, r.role, 
  CASE 
    WHEN p.route = '/admin' THEN (r.role = 'admin')
    WHEN p.route = '/approvals' THEN (r.role IN ('admin', 'tech_lead', 'management'))
    WHEN p.route = '/skill-explorer' THEN (r.role IN ('admin', 'tech_lead', 'management'))
    WHEN p.route = '/reports' THEN (r.role IN ('admin', 'management'))
    ELSE true
  END
FROM public.pages p
CROSS JOIN (VALUES ('admin'), ('management'), ('tech_lead'), ('employee')) AS r(role)
ON CONFLICT (page_id, role_name) DO NOTHING;

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION update_page_access_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_page_access_timestamp
BEFORE UPDATE ON public.page_access
FOR EACH ROW
EXECUTE FUNCTION update_page_access_updated_at();