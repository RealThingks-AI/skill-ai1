-- Create user category preferences table
CREATE TABLE public.user_category_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  visible_category_ids UUID[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable Row Level Security
ALTER TABLE public.user_category_preferences ENABLE ROW LEVEL SECURITY;

-- Create policies for user category preferences
CREATE POLICY "Users can manage their own category preferences" 
ON public.user_category_preferences 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_user_category_preferences_updated_at
BEFORE UPDATE ON public.user_category_preferences
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();