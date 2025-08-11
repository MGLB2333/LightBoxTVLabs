-- Create sales house to station mapping tables
-- Run this in your Supabase SQL editor

-- Create sales houses table
CREATE TABLE IF NOT EXISTS barb_sales_houses (
  id SERIAL PRIMARY KEY,
  sales_house_name TEXT UNIQUE NOT NULL,
  sales_house_code TEXT,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create sales house to station mapping table
CREATE TABLE IF NOT EXISTS barb_sales_house_stations (
  id SERIAL PRIMARY KEY,
  sales_house_id INTEGER REFERENCES barb_sales_houses(id) ON DELETE CASCADE,
  station_code TEXT NOT NULL,
  station_name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(sales_house_id, station_code)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_barb_sales_houses_name ON barb_sales_houses(sales_house_name);
CREATE INDEX IF NOT EXISTS idx_barb_sales_house_stations_sales_house_id ON barb_sales_house_stations(sales_house_id);
CREATE INDEX IF NOT EXISTS idx_barb_sales_house_stations_station_name ON barb_sales_house_stations(station_name);

-- Insert initial sales houses
INSERT INTO barb_sales_houses (sales_house_name, description) VALUES
  ('ITV Sales', 'ITV Network Sales House'),
  ('Sky Media', 'Sky Media Sales House'),
  ('Channel 4 Sales', 'Channel 4 Sales House'),
  ('Channel 5 Sales', 'Channel 5 Sales House'),
  ('UKTV Sales', 'UKTV Sales House'),
  ('Discovery Networks', 'Discovery Networks Sales House'),
  ('ViacomCBS', 'ViacomCBS Sales House'),
  ('WarnerMedia', 'WarnerMedia Sales House'),
  ('Disney', 'Disney Sales House'),
  ('BBC Studios', 'BBC Studios Sales House')
ON CONFLICT (sales_house_name) DO NOTHING;

-- Insert ITV Sales stations
INSERT INTO barb_sales_house_stations (sales_house_id, station_code, station_name)
SELECT sh.id, station_code, station_name
FROM barb_sales_houses sh
CROSS JOIN (VALUES
  ('ITV1', 'ITV1'),
  ('ITV2', 'ITV2'),
  ('ITV3', 'ITV3'),
  ('ITV4', 'ITV4'),
  ('ITVBE', 'ITVBe'),
  ('ITV1_LONDON', 'ITV1 London'),
  ('ITV1_ANGLIA', 'ITV1 Anglia'),
  ('ITV1_CENTRAL', 'ITV1 Central'),
  ('ITV1_GRANADA', 'ITV1 Granada'),
  ('ITV1_MERIDIAN', 'ITV1 Meridian'),
  ('ITV1_TYNE_TEES', 'ITV1 Tyne Tees'),
  ('ITV1_WALES', 'ITV1 Wales'),
  ('ITV1_WEST_COUNTRY', 'ITV1 West Country'),
  ('ITV1_YORKSHIRE', 'ITV1 Yorkshire'),
  ('ITV1_BORDER', 'ITV1 Border'),
  ('ITV1_CHANNEL', 'ITV1 Channel'),
  ('ITV1_UTV', 'ITV1 UTV'),
  ('ITV1_STV', 'ITV1 STV'),
  ('CARLTON', 'Carlton'),
  ('CARLTON_CENTRAL', 'Carlton Central'),
  ('CARLTON_LONDON', 'Carlton London'),
  ('CARLTON_WESTCOUNTRY', 'Carlton Westcountry'),
  ('CARLTON_YORKSHIRE', 'Carlton Yorkshire'),
  ('CARLTON_ANGLIA', 'Carlton Anglia'),
  ('CARLTON_GRANADA', 'Carlton Granada'),
  ('CARLTON_MERIDIAN', 'Carlton Meridian'),
  ('CARLTON_TYNE_TEES', 'Carlton Tyne Tees'),
  ('CARLTON_BORDER', 'Carlton Border'),
  ('CARLTON_WALES', 'Carlton Wales'),
  ('CARLTON_UTV', 'Carlton UTV'),
  ('CARLTON_STV', 'Carlton STV')
) AS stations(station_code, station_name)
WHERE sh.sales_house_name = 'ITV Sales'
ON CONFLICT (sales_house_id, station_code) DO NOTHING;

-- Insert Sky Media stations
INSERT INTO barb_sales_house_stations (sales_house_id, station_code, station_name)
SELECT sh.id, station_code, station_name
FROM barb_sales_houses sh
CROSS JOIN (VALUES
  ('SKY_SPORTS_MAIN_EVENT', 'Sky Sports Main Event'),
  ('SKY_SPORTS_PREMIER_LEAGUE', 'Sky Sports Premier League'),
  ('SKY_SPORTS_FOOTBALL', 'Sky Sports Football'),
  ('SKY_SPORTS_CRICKET', 'Sky Sports Cricket'),
  ('SKY_SPORTS_GOLF', 'Sky Sports Golf'),
  ('SKY_SPORTS_F1', 'Sky Sports F1'),
  ('SKY_SPORTS_ACTION', 'Sky Sports Action'),
  ('SKY_SPORTS_ARENA', 'Sky Sports Arena'),
  ('SKY_SPORTS_NEWS', 'Sky Sports News'),
  ('SKY_ONE', 'Sky One'),
  ('SKY_ATLANTIC', 'Sky Atlantic'),
  ('SKY_WITNESS', 'Sky Witness'),
  ('SKY_CRIME', 'Sky Crime'),
  ('SKY_COMEDY', 'Sky Comedy'),
  ('SKY_ARTS', 'Sky Arts'),
  ('SKY_NEWS', 'Sky News'),
  ('SKY_CINEMA', 'Sky Cinema'),
  ('SKY_CINEMA_PREMIERE', 'Sky Cinema Premiere'),
  ('SKY_CINEMA_ACTION', 'Sky Cinema Action'),
  ('SKY_CINEMA_COMEDY', 'Sky Cinema Comedy'),
  ('SKY_CINEMA_DRAMA', 'Sky Cinema Drama'),
  ('SKY_CINEMA_FAMILY', 'Sky Cinema Family'),
  ('SKY_CINEMA_THRILLER', 'Sky Cinema Thriller'),
  ('SKY_CINEMA_SCIFI_HORROR', 'Sky Cinema Sci-Fi & Horror'),
  ('SKY_CINEMA_SELECT', 'Sky Cinema Select'),
  ('SKY_CINEMA_GREATS', 'Sky Cinema Greats'),
  ('SKY_CINEMA_ANIMATION', 'Sky Cinema Animation'),
  ('SKY_CINEMA_KIDS', 'Sky Cinema Kids'),
  ('SKY_CINEMA_HITS', 'Sky Cinema Hits'),
  ('SKY_CINEMA_CLASSICS', 'Sky Cinema Classics')
) AS stations(station_code, station_name)
WHERE sh.sales_house_name = 'Sky Media'
ON CONFLICT (sales_house_id, station_code) DO NOTHING;

-- Insert Channel 4 Sales stations
INSERT INTO barb_sales_house_stations (sales_house_id, station_code, station_name)
SELECT sh.id, station_code, station_name
FROM barb_sales_houses sh
CROSS JOIN (VALUES
  ('CHANNEL_4', 'Channel 4'),
  ('E4', 'E4'),
  ('MORE4', 'More4'),
  ('4MUSIC', '4Music'),
  ('CHANNEL_4_HD', 'Channel 4 HD'),
  ('E4_HD', 'E4 HD'),
  ('MORE4_HD', 'More4 HD'),
  ('4SEVEN', '4Seven'),
  ('4SEVEN_HD', '4Seven HD'),
  ('FILM4', 'Film4'),
  ('FILM4_HD', 'Film4 HD')
) AS stations(station_code, station_name)
WHERE sh.sales_house_name = 'Channel 4 Sales'
ON CONFLICT (sales_house_id, station_code) DO NOTHING;

-- Insert Channel 5 Sales stations
INSERT INTO barb_sales_house_stations (sales_house_id, station_code, station_name)
SELECT sh.id, station_code, station_name
FROM barb_sales_houses sh
CROSS JOIN (VALUES
  ('CHANNEL_5', 'Channel 5'),
  ('5STAR', '5STAR'),
  ('5USA', '5USA'),
  ('5SELECT', '5Select'),
  ('CHANNEL_5_HD', 'Channel 5 HD'),
  ('5STAR_HD', '5STAR HD'),
  ('5USA_HD', '5USA HD'),
  ('5SELECT_HD', '5Select HD')
) AS stations(station_code, station_name)
WHERE sh.sales_house_name = 'Channel 5 Sales'
ON CONFLICT (sales_house_id, station_code) DO NOTHING;

-- Insert UKTV Sales stations
INSERT INTO barb_sales_house_stations (sales_house_id, station_code, station_name)
SELECT sh.id, station_code, station_name
FROM barb_sales_houses sh
CROSS JOIN (VALUES
  ('DAVE', 'Dave'),
  ('GOLD', 'Gold'),
  ('W', 'W'),
  ('YESTERDAY', 'Yesterday'),
  ('DRAMA', 'Drama'),
  ('ALIBI', 'Alibi'),
  ('EDEN', 'Eden'),
  ('HOME', 'Home'),
  ('REALLY', 'Really'),
  ('DAVE_HD', 'Dave HD'),
  ('GOLD_HD', 'Gold HD'),
  ('W_HD', 'W HD'),
  ('YESTERDAY_HD', 'Yesterday HD'),
  ('DRAMA_HD', 'Drama HD'),
  ('ALIBI_HD', 'Alibi HD'),
  ('EDEN_HD', 'Eden HD'),
  ('HOME_HD', 'Home HD'),
  ('REALLY_HD', 'Really HD')
) AS stations(station_code, station_name)
WHERE sh.sales_house_name = 'UKTV Sales'
ON CONFLICT (sales_house_id, station_code) DO NOTHING;

-- Create a view for easy querying
CREATE OR REPLACE VIEW barb_sales_house_station_mapping AS
SELECT 
  sh.sales_house_name,
  shs.station_code,
  shs.station_name,
  shs.is_active
FROM barb_sales_houses sh
JOIN barb_sales_house_stations shs ON sh.id = shs.sales_house_id
WHERE sh.is_active = true AND shs.is_active = true
ORDER BY sh.sales_house_name, shs.station_name; 