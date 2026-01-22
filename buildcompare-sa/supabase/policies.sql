-- ========================================
-- DROP EXISTING POLICIES (if any)
-- ========================================
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

DROP POLICY IF EXISTS "Users can view own projects" ON projects;
DROP POLICY IF EXISTS "Users can view their own projects" ON projects;
DROP POLICY IF EXISTS "Users can insert own projects" ON projects;
DROP POLICY IF EXISTS "Users can insert their own projects" ON projects;
DROP POLICY IF EXISTS "Users can update own projects" ON projects;
DROP POLICY IF EXISTS "Users can update their own projects" ON projects;
DROP POLICY IF EXISTS "Users can delete own projects" ON projects;
DROP POLICY IF EXISTS "Users can delete their own projects" ON projects;

DROP POLICY IF EXISTS "Users can view project materials" ON project_materials;
DROP POLICY IF EXISTS "Users can insert project materials" ON project_materials;
DROP POLICY IF EXISTS "Users can update project materials" ON project_materials;
DROP POLICY IF EXISTS "Users can delete project materials" ON project_materials;

DROP POLICY IF EXISTS "Users can view own boq history" ON boq_history;
DROP POLICY IF EXISTS "Users can insert own boq history" ON boq_history;

DROP POLICY IF EXISTS "Users can view own pod logs" ON pod_logs;
DROP POLICY IF EXISTS "Users can insert own pod logs" ON pod_logs;

DROP POLICY IF EXISTS "Users can manage own price alerts" ON price_alerts;
DROP POLICY IF EXISTS "Users can manage their own price alerts" ON price_alerts;

DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;

-- ========================================
-- Enable Row Level Security
-- ========================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE boq_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE pod_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- ========================================
-- PROFILES POLICIES
-- ========================================
CREATE POLICY "Users can view own profile" 
ON profiles FOR SELECT 
USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
ON profiles FOR UPDATE 
USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" 
ON profiles FOR INSERT 
WITH CHECK (auth.uid() = id);

-- ========================================
-- PROJECTS POLICIES
-- ========================================
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

-- ========================================
-- PROJECT_MATERIALS POLICIES
-- ========================================
CREATE POLICY "Users can view project materials" 
ON project_materials FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM projects 
        WHERE projects.id = project_materials.project_id 
        AND projects.user_id = auth.uid()
    )
);

CREATE POLICY "Users can insert project materials" 
ON project_materials FOR INSERT 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM projects 
        WHERE projects.id = project_materials.project_id 
        AND projects.user_id = auth.uid()
    )
);

CREATE POLICY "Users can update project materials" 
ON project_materials FOR UPDATE 
USING (
    EXISTS (
        SELECT 1 FROM projects 
        WHERE projects.id = project_materials.project_id 
        AND projects.user_id = auth.uid()
    )
);

CREATE POLICY "Users can delete project materials" 
ON project_materials FOR DELETE 
USING (
    EXISTS (
        SELECT 1 FROM projects 
        WHERE projects.id = project_materials.project_id 
        AND projects.user_id = auth.uid()
    )
);

-- ========================================
-- BOQ_HISTORY POLICIES
-- ========================================
CREATE POLICY "Users can view own boq history" 
ON boq_history FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM projects 
        WHERE projects.id = boq_history.project_id 
        AND projects.user_id = auth.uid()
    )
);

CREATE POLICY "Users can insert own boq history" 
ON boq_history FOR INSERT 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM projects 
        WHERE projects.id = boq_history.project_id 
        AND projects.user_id = auth.uid()
    )
);

-- ========================================
-- POD_LOGS POLICIES
-- ========================================
CREATE POLICY "Users can view own pod logs" 
ON pod_logs FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM projects 
        WHERE projects.id = pod_logs.project_id 
        AND projects.user_id = auth.uid()
    )
);

CREATE POLICY "Users can insert own pod logs" 
ON pod_logs FOR INSERT 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM projects 
        WHERE projects.id = pod_logs.project_id 
        AND projects.user_id = auth.uid()
    )
);

-- ========================================
-- PRICE_ALERTS POLICIES
-- ========================================
CREATE POLICY "Users can manage own price alerts" 
ON price_alerts FOR ALL 
USING (auth.uid() = user_id);

-- ========================================
-- NOTIFICATIONS POLICIES
-- ========================================
CREATE POLICY "Users can view own notifications" 
ON notifications FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" 
ON notifications FOR UPDATE 
USING (auth.uid() = user_id);