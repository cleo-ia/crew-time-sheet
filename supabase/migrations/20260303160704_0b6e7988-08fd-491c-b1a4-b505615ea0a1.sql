
-- Step 1a: Add created_by to taches_chantier
ALTER TABLE taches_chantier ADD COLUMN created_by uuid DEFAULT NULL;

-- Step 1b: Create planning_last_seen table
CREATE TABLE planning_last_seen (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  chantier_id uuid NOT NULL,
  entreprise_id uuid NOT NULL,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, chantier_id)
);

ALTER TABLE planning_last_seen ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own last_seen"
  ON planning_last_seen FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
