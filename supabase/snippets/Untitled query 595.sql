-- Check invitations table
SELECT * FROM public.invitations ORDER BY created_at DESC LIMIT 10;
-- Check organization_members
SELECT om.*, o.name as org_name 
FROM public.organization_members om
JOIN public.organizations o ON o.id = om.organization_id
ORDER BY om.created_at DESC LIMIT 10;