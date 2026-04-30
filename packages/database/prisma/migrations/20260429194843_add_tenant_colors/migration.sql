-- AlterTable: adiciona campos de branding/cores ao tenant
ALTER TABLE "tenants" ADD COLUMN "colorPrimary"   VARCHAR(7),
                      ADD COLUMN "colorSecondary" VARCHAR(7),
                      ADD COLUMN "colorSidebar"   VARCHAR(7);
