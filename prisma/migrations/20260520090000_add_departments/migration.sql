CREATE TABLE "departments" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "owner_admin_id" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "departments_name_owner_admin_id_key" ON "departments"("name", "owner_admin_id");
CREATE INDEX "departments_owner_admin_id_idx" ON "departments"("owner_admin_id");
