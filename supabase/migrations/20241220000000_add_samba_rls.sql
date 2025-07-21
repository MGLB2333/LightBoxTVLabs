-- Enable RLS on samba_sample table
ALTER TABLE public.samba_sample ENABLE ROW LEVEL SECURITY;

-- Create policy to allow authenticated users to read samba_sample data
CREATE POLICY "Allow authenticated users to read samba_sample" ON public.samba_sample
    FOR SELECT
    TO authenticated
    USING (true); 