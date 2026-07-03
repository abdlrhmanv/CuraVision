-- AlterTable
ALTER TABLE "ScanAnalysis" ADD COLUMN     "brain_hemisphere" TEXT,
ADD COLUMN     "confidence" DOUBLE PRECISION,
ADD COLUMN     "estimated_diameter" DOUBLE PRECISION,
ADD COLUMN     "growth_pct" DOUBLE PRECISION,
ADD COLUMN     "lobe" TEXT,
ADD COLUMN     "processing_time_sec" DOUBLE PRECISION,
ADD COLUMN     "risk_level" TEXT,
ADD COLUMN     "segmentation_quality" TEXT,
ADD COLUMN     "suggested_action" TEXT,
ADD COLUMN     "tumor_type" TEXT;
