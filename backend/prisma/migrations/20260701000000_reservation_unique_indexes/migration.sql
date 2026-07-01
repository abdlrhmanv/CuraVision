-- CreateIndex
CREATE INDEX "Reservation_start_time_idx" ON "Reservation"("start_time");

-- CreateIndex
CREATE INDEX "Reservation_end_time_idx" ON "Reservation"("end_time");

-- CreateIndex
CREATE UNIQUE INDEX "Reservation_doctor_id_start_time_end_time_key" ON "Reservation"("doctor_id", "start_time", "end_time");
