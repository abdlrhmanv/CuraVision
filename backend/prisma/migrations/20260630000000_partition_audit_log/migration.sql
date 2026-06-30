-- Rename existing non-partitioned AuditLog table
ALTER TABLE "AuditLog" RENAME TO "AuditLog_old";

-- Drop the old primary key constraint
ALTER TABLE "AuditLog_old" DROP CONSTRAINT IF EXISTS "AuditLog_pkey";

-- Create the new partitioned AuditLog table
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" TEXT,
    "action" TEXT NOT NULL,
    "entity_type" TEXT,
    "entity_id" TEXT,
    "metadata" JSONB,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id", "timestamp")
) PARTITION BY RANGE ("timestamp");

-- Create default partition to catch all inserts
CREATE TABLE "AuditLog_default" PARTITION OF "AuditLog" DEFAULT;

-- Pre-create ranges for past/present/future years
CREATE TABLE "AuditLog_y2025" PARTITION OF "AuditLog"
    FOR VALUES FROM ('2025-01-01 00:00:00') TO ('2026-01-01 00:00:00');

CREATE TABLE "AuditLog_y2026" PARTITION OF "AuditLog"
    FOR VALUES FROM ('2026-01-01 00:00:00') TO ('2027-01-01 00:00:00');

CREATE TABLE "AuditLog_y2027" PARTITION OF "AuditLog"
    FOR VALUES FROM ('2027-01-01 00:00:00') TO ('2028-01-01 00:00:00');

-- Re-create foreign key reference to User
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Copy any existing audit data into the new partitioned table
INSERT INTO "AuditLog" ("id", "timestamp", "user_id", "action", "entity_type", "entity_id", "metadata")
SELECT "id", "timestamp", "user_id", "action", "entity_type", "entity_id", "metadata" FROM "AuditLog_old";

-- Drop the old table
DROP TABLE "AuditLog_old";

-- Re-create index constraints
CREATE INDEX "AuditLog_user_id_idx" ON "AuditLog"("user_id");
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");
CREATE INDEX "AuditLog_entity_type_entity_id_idx" ON "AuditLog"("entity_type", "entity_id");
CREATE INDEX "AuditLog_timestamp_idx" ON "AuditLog"("timestamp");
