-- Create user profiles table with roles
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'employee' CHECK (role IN ('employee', 'tech_lead', 'management')),
  department TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create skill categories
CREATE TABLE public.skill_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  color TEXT DEFAULT '#3B82F6',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.skill_categories ENABLE ROW LEVEL SECURITY;

-- Create skills
CREATE TABLE public.skills (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID NOT NULL REFERENCES public.skill_categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;

-- Create user skills with ratings and approval workflow
CREATE TABLE public.user_skills (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES public.skills(id) ON DELETE CASCADE,
  rating TEXT NOT NULL CHECK (rating IN ('high', 'medium', 'low')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'rejected')),
  self_comment TEXT,
  approver_comment TEXT,
  approved_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  submitted_at TIMESTAMP WITH TIME ZONE,
  approved_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(user_id, skill_id)
);

-- Enable RLS
ALTER TABLE public.user_skills ENABLE ROW LEVEL SECURITY;

-- Create projects
CREATE TABLE public.projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'on_hold')),
  tech_lead_id UUID REFERENCES auth.users(id),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Create project assignments
CREATE TABLE public.project_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(project_id, user_id)
);

-- Enable RLS
ALTER TABLE public.project_assignments ENABLE ROW LEVEL SECURITY;

-- Create notifications
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'error')),
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Profiles: Users can view all profiles but only update their own
CREATE POLICY "Anyone can view profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Skill categories: Everyone can view, only management can modify
CREATE POLICY "Anyone can view skill categories" ON public.skill_categories FOR SELECT USING (true);
CREATE POLICY "Management can manage skill categories" ON public.skill_categories FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'management')
);

-- Skills: Everyone can view, only management can modify
CREATE POLICY "Anyone can view skills" ON public.skills FOR SELECT USING (true);
CREATE POLICY "Management can manage skills" ON public.skills FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'management')
);

-- User skills: Users can manage their own, tech leads can approve their team
CREATE POLICY "Users can view their own skills and tech leads can view team skills" ON public.user_skills FOR SELECT USING (
  auth.uid() = user_id OR 
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role IN ('tech_lead', 'management'))
);
CREATE POLICY "Users can manage their own skills" ON public.user_skills FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own skills" ON public.user_skills FOR UPDATE USING (
  auth.uid() = user_id OR 
  (EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role IN ('tech_lead', 'management')) AND status = 'submitted')
);

-- Projects: All authenticated users can view, tech leads and management can manage
CREATE POLICY "Anyone can view projects" ON public.projects FOR SELECT USING (true);
CREATE POLICY "Tech leads and management can manage projects" ON public.projects FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role IN ('tech_lead', 'management'))
);

-- Project assignments: Everyone can view, tech leads and management can manage
CREATE POLICY "Anyone can view project assignments" ON public.project_assignments FOR SELECT USING (true);
CREATE POLICY "Tech leads and management can manage assignments" ON public.project_assignments FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role IN ('tech_lead', 'management'))
);

-- Notifications: Users can only see their own notifications
CREATE POLICY "Users can view their own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System can insert notifications" ON public.notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update their own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_skills_updated_at
  BEFORE UPDATE ON public.user_skills
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Insert sample skill categories and skills
INSERT INTO public.skill_categories (name, description, color) VALUES
  ('Frontend', 'Frontend development technologies and frameworks', '#3B82F6'),
  ('Backend', 'Backend development and server-side technologies', '#8B5CF6'),
  ('Database', 'Database design and management', '#06B6D4'),
  ('DevOps', 'Development operations and infrastructure', '#10B981'),
  ('Mobile', 'Mobile application development', '#F59E0B'),
  ('Design', 'UI/UX design and visual design skills', '#EF4444'),
  ('Management', 'Project and team management skills', '#6366F1');

INSERT INTO public.skills (category_id, name, description) VALUES
  ((SELECT id FROM public.skill_categories WHERE name = 'Frontend'), 'React', 'React.js framework for building user interfaces'),
  ((SELECT id FROM public.skill_categories WHERE name = 'Frontend'), 'Vue.js', 'Progressive JavaScript framework'),
  ((SELECT id FROM public.skill_categories WHERE name = 'Frontend'), 'Angular', 'TypeScript-based web application framework'),
  ((SELECT id FROM public.skill_categories WHERE name = 'Frontend'), 'TypeScript', 'Typed superset of JavaScript'),
  ((SELECT id FROM public.skill_categories WHERE name = 'Frontend'), 'CSS/SCSS', 'Styling and responsive design'),
  ((SELECT id FROM public.skill_categories WHERE name = 'Backend'), 'Node.js', 'JavaScript runtime for backend development'),
  ((SELECT id FROM public.skill_categories WHERE name = 'Backend'), 'Python', 'Python programming language'),
  ((SELECT id FROM public.skill_categories WHERE name = 'Backend'), 'Java', 'Java programming language'),
  ((SELECT id FROM public.skill_categories WHERE name = 'Backend'), 'C#/.NET', 'Microsoft .NET framework'),
  ((SELECT id FROM public.skill_categories WHERE name = 'Backend'), 'PHP', 'PHP programming language'),
  ((SELECT id FROM public.skill_categories WHERE name = 'Database'), 'PostgreSQL', 'Advanced open-source relational database'),
  ((SELECT id FROM public.skill_categories WHERE name = 'Database'), 'MySQL', 'Popular relational database management system'),
  ((SELECT id FROM public.skill_categories WHERE name = 'Database'), 'MongoDB', 'NoSQL document database'),
  ((SELECT id FROM public.skill_categories WHERE name = 'Database'), 'Redis', 'In-memory data structure store'),
  ((SELECT id FROM public.skill_categories WHERE name = 'DevOps'), 'Docker', 'Containerization platform'),
  ((SELECT id FROM public.skill_categories WHERE name = 'DevOps'), 'Kubernetes', 'Container orchestration platform'),
  ((SELECT id FROM public.skill_categories WHERE name = 'DevOps'), 'AWS', 'Amazon Web Services cloud platform'),
  ((SELECT id FROM public.skill_categories WHERE name = 'DevOps'), 'CI/CD', 'Continuous Integration and Deployment'),
  ((SELECT id FROM public.skill_categories WHERE name = 'Mobile'), 'React Native', 'Cross-platform mobile development'),
  ((SELECT id FROM public.skill_categories WHERE name = 'Mobile'), 'Flutter', 'Google UI toolkit for mobile apps'),
  ((SELECT id FROM public.skill_categories WHERE name = 'Mobile'), 'iOS Development', 'Native iOS application development'),
  ((SELECT id FROM public.skill_categories WHERE name = 'Mobile'), 'Android Development', 'Native Android application development'),
  ((SELECT id FROM public.skill_categories WHERE name = 'Design'), 'Figma', 'Collaborative design tool'),
  ((SELECT id FROM public.skill_categories WHERE name = 'Design'), 'Adobe Creative Suite', 'Creative design software suite'),
  ((SELECT id FROM public.skill_categories WHERE name = 'Design'), 'UI/UX Design', 'User interface and experience design'),
  ((SELECT id FROM public.skill_categories WHERE name = 'Management'), 'Agile/Scrum', 'Agile project management methodologies'),
  ((SELECT id FROM public.skill_categories WHERE name = 'Management'), 'Team Leadership', 'Leading and managing teams'),
  ((SELECT id FROM public.skill_categories WHERE name = 'Management'), 'Strategic Planning', 'Long-term planning and strategy');