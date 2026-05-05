-- AlterTable: adiciona campo bannerUrl ao tenant (imagem de fundo na tela de login)
ALTER TABLE "tenants" ADD COLUMN "bannerUrl" TEXT;
