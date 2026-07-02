/*
  Warnings:

  - The `allergies` column on the `PatientProfile` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "DoctorProfile" ADD COLUMN     "board_certifications" JSONB,
ADD COLUMN     "city" TEXT,
ADD COLUMN     "consultation_fee" DOUBLE PRECISION,
ADD COLUMN     "country" TEXT,
ADD COLUMN     "date_of_birth" TIMESTAMP(3),
ADD COLUMN     "languages_spoken" JSONB,
ADD COLUMN     "qualifications" JSONB,
ADD COLUMN     "subspecialties" JSONB;

-- AlterTable
ALTER TABLE "PatientProfile" ADD COLUMN     "address" TEXT,
ADD COLUMN     "alcohol_status" TEXT,
ADD COLUMN     "blood_type" TEXT,
ADD COLUMN     "chronic_diseases" JSONB,
ADD COLUMN     "city" TEXT,
ADD COLUMN     "current_medications" JSONB,
ADD COLUMN     "family_medical_history" TEXT,
ADD COLUMN     "height_cm" DOUBLE PRECISION,
ADD COLUMN     "previous_surgeries" TEXT,
ADD COLUMN     "smoking_status" TEXT,
ADD COLUMN     "weight_kg" DOUBLE PRECISION,
DROP COLUMN "allergies",
ADD COLUMN     "allergies" JSONB;

-- CreateTable
CREATE TABLE "PatientPreferences" (
    "user_id" TEXT NOT NULL,
    "preferred_language" TEXT NOT NULL DEFAULT 'English',
    "notification_email" BOOLEAN NOT NULL DEFAULT true,
    "notification_sms" BOOLEAN NOT NULL DEFAULT false,
    "notification_push" BOOLEAN NOT NULL DEFAULT true,
    "share_anonymized_scans" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "PatientPreferences_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "DoctorPreferences" (
    "user_id" TEXT NOT NULL,
    "preferred_ai_model" TEXT NOT NULL DEFAULT 'GPT-5',
    "enable_ai_suggestions" BOOLEAN NOT NULL DEFAULT true,
    "default_report_template" TEXT NOT NULL DEFAULT 'Brain MRI',
    "notification_email" BOOLEAN NOT NULL DEFAULT true,
    "notification_sms" BOOLEAN NOT NULL DEFAULT false,
    "notification_push" BOOLEAN NOT NULL DEFAULT true,
    "notification_critical" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "DoctorPreferences_pkey" PRIMARY KEY ("user_id")
);

-- AddForeignKey
ALTER TABLE "PatientPreferences" ADD CONSTRAINT "PatientPreferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DoctorPreferences" ADD CONSTRAINT "DoctorPreferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
