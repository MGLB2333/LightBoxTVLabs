-- YouTube Curation Database Tables

-- Table to store YouTube channels data
CREATE TABLE youtube_channels (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    channel_id VARCHAR(255) UNIQUE NOT NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    subscriber_count INTEGER,
    video_count INTEGER,
    view_count BIGINT,
    published_at TIMESTAMP WITH TIME ZONE,
    thumbnails JSONB,
    country VARCHAR(10),
    custom_url VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table to store curated packages/lists
CREATE TABLE youtube_curated_packages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Junction table to link channels to curated packages
CREATE TABLE youtube_package_channels (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    package_id UUID REFERENCES youtube_curated_packages(id) ON DELETE CASCADE,
    channel_id VARCHAR(255) REFERENCES youtube_channels(channel_id) ON DELETE CASCADE,
    added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    added_by UUID REFERENCES auth.users(id),
    notes TEXT,
    UNIQUE(package_id, channel_id)
);

-- Table to store search history and queries
CREATE TABLE youtube_search_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    query VARCHAR(500) NOT NULL,
    results_count INTEGER,
    search_type VARCHAR(50), -- 'channel', 'video', 'playlist'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table to store export/download history
CREATE TABLE youtube_export_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    package_id UUID REFERENCES youtube_curated_packages(id) ON DELETE CASCADE,
    export_type VARCHAR(50) NOT NULL, -- 'csv', 'google_ads', 'json'
    channel_count INTEGER,
    file_path VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX idx_youtube_channels_channel_id ON youtube_channels(channel_id);
CREATE INDEX idx_youtube_channels_title ON youtube_channels(title);
CREATE INDEX idx_youtube_package_channels_package_id ON youtube_package_channels(package_id);
CREATE INDEX idx_youtube_package_channels_channel_id ON youtube_package_channels(channel_id);
CREATE INDEX idx_youtube_curated_packages_user_id ON youtube_curated_packages(user_id);
CREATE INDEX idx_youtube_curated_packages_org_id ON youtube_curated_packages(organization_id);
CREATE INDEX idx_youtube_search_history_user_id ON youtube_search_history(user_id);
CREATE INDEX idx_youtube_search_history_created_at ON youtube_search_history(created_at DESC);

-- RLS Policies
ALTER TABLE youtube_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE youtube_curated_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE youtube_package_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE youtube_search_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE youtube_export_history ENABLE ROW LEVEL SECURITY;

-- Policies for youtube_channels (readable by all authenticated users)
CREATE POLICY "Users can view all YouTube channels" ON youtube_channels
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can insert YouTube channels" ON youtube_channels
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update YouTube channels" ON youtube_channels
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Policies for youtube_curated_packages
CREATE POLICY "Users can view their own packages and public packages" ON youtube_curated_packages
    FOR SELECT USING (
        auth.uid() = user_id OR 
        is_public = true OR
        organization_id IN (
            SELECT organization_id FROM organization_members 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create packages" ON youtube_curated_packages
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own packages" ON youtube_curated_packages
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own packages" ON youtube_curated_packages
    FOR DELETE USING (auth.uid() = user_id);

-- Policies for youtube_package_channels
CREATE POLICY "Users can view channels in accessible packages" ON youtube_package_channels
    FOR SELECT USING (
        package_id IN (
            SELECT id FROM youtube_curated_packages 
            WHERE user_id = auth.uid() OR 
                  is_public = true OR
                  organization_id IN (
                      SELECT organization_id FROM organization_members 
                      WHERE user_id = auth.uid()
                  )
        )
    );

CREATE POLICY "Users can add channels to their packages" ON youtube_package_channels
    FOR INSERT WITH CHECK (
        package_id IN (
            SELECT id FROM youtube_curated_packages 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can remove channels from their packages" ON youtube_package_channels
    FOR DELETE USING (
        package_id IN (
            SELECT id FROM youtube_curated_packages 
            WHERE user_id = auth.uid()
        )
    );

-- Policies for youtube_search_history
CREATE POLICY "Users can view their own search history" ON youtube_search_history
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own search history" ON youtube_search_history
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policies for youtube_export_history
CREATE POLICY "Users can view their own export history" ON youtube_export_history
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own export history" ON youtube_export_history
    FOR INSERT WITH CHECK (auth.uid() = user_id); 