-- Widget System Migration
-- This migration creates the widgets table and sets up RLS policies
-- Create widgets table
CREATE TABLE IF NOT EXISTS public.widgets (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users NOT NULL,
    name text NOT NULL,
    category text NOT NULL CHECK (category IN ('READING', 'CONTROLLING')),
    widget_type text NOT NULL,
    mqtt_topic text NOT NULL,
    mqtt_action text NOT NULL CHECK (mqtt_action IN ('SUBSCRIBE', 'PUBLISH')),
    variable_name text NOT NULL,
    data_label text,
    config jsonb DEFAULT '{}'::jsonb,
    position integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);
-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_widgets_user_id ON public.widgets(user_id);
CREATE INDEX IF NOT EXISTS idx_widgets_position ON public.widgets(user_id, position);
CREATE INDEX IF NOT EXISTS idx_widgets_active ON public.widgets(user_id, is_active);
-- Enable Row Level Security
ALTER TABLE public.widgets ENABLE ROW LEVEL SECURITY;
-- Drop existing policies if they exist (for re-running migration)
DROP POLICY IF EXISTS "Users can view their own widgets" ON widgets;
DROP POLICY IF EXISTS "Users can insert their own widgets" ON widgets;
DROP POLICY IF EXISTS "Users can update their own widgets" ON widgets;
DROP POLICY IF EXISTS "Users can delete their own widgets" ON widgets;
DROP POLICY IF EXISTS "Admins can manage all widgets" ON widgets;
-- RLS Policies: Users can manage their own widgets
CREATE POLICY "Users can view their own widgets" ON widgets FOR
SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own widgets" ON widgets FOR
INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own widgets" ON widgets FOR
UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own widgets" ON widgets FOR DELETE USING (auth.uid() = user_id);
-- RLS Policy: Admins can manage all widgets
CREATE POLICY "Admins can manage all widgets" ON widgets FOR ALL USING (
    (
        SELECT role
        FROM public.profiles
        WHERE id = auth.uid()
    ) = 'ADMIN'
);
-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now();
RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS on_widget_updated ON public.widgets;
CREATE TRIGGER on_widget_updated BEFORE
UPDATE ON public.widgets FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
-- Note: The config field in profiles table is kept for backward compatibility
-- It will be manually removed after migration is verified