CREATE TABLE "office_locations" (
    "id" TEXT NOT NULL,
    "office_name" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "timezone" TEXT NOT NULL,
    "owner_admin_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "office_locations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "office_locations_office_name_owner_admin_id_key" ON "office_locations"("office_name", "owner_admin_id");
CREATE INDEX "office_locations_owner_admin_id_idx" ON "office_locations"("owner_admin_id");
