-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can view and edit their own profile
CREATE POLICY "Users can view own profile" 
ON profiles FOR SELECT 
USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
ON profiles FOR UPDATE 
USING (auth.uid() = id);

-- Projects: Users can only see their own projects
CREATE POLICY "Users can view own projects" 
ON projects FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own projects" 
ON projects FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own projects" 
ON projects FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own projects" 
ON projects FOR DELETE 
USING (auth.uid() = user_id);

-- Materials: Linked to projects, so check via project ownership would be ideal, 
-- but if materials table has user_id, it is simpler.
-- Assuming materials has a user_id or project_id link. 
-- Here is a generic policy assuming direct user ownership for simplicity.
-- Adjust foreign key checks if complex joins are needed.

CREATE POLICY "Users can view own materials" 
ON materials FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own materials" 
ON materials FOR ALL 
USING (auth.uid() = user_id);

-- Rate Limits & Logs (Admin only or System)
-- Typically not exposed to client, but if so:
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "No access to audit logs" 
ON audit_logs FOR ALL 
USING (false);  -- Deny all by default
