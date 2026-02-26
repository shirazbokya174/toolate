-- ============================================================================
-- ADD LOCATION COLUMNS AND GEOHASH TO BRANCHES
-- ============================================================================
-- Date: 2026-02-27
-- Purpose: Add latitude, longitude, and geohash for location-based features
-- ============================================================================

-- Add location columns
ALTER TABLE public.branches 
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8),
ADD COLUMN IF NOT EXISTS geohash VARCHAR(12);

-- Create index on geohash for fast nearby queries
CREATE INDEX IF NOT EXISTS idx_branches_geohash ON public.branches(geohash);

-- Create index on coordinates for distance calculations
CREATE INDEX IF NOT EXISTS idx_branches_coords ON public.branches(latitude, longitude);
