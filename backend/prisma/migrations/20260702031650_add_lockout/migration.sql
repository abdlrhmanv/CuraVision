-- AlterEnum
ALTER TYPE "UserStatus" ADD VALUE 'LOCKED';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "lockout_until" TIMESTAMP(3),
ADD COLUMN     "login_attempts" INTEGER NOT NULL DEFAULT 0;
