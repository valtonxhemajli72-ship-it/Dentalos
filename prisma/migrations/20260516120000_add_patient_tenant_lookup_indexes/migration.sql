CREATE INDEX "Patient_tenantId_email_idx" ON "Patient"("tenantId", "email");

CREATE INDEX "Patient_tenantId_phone_idx" ON "Patient"("tenantId", "phone");

CREATE INDEX "Patient_tenantId_firstName_lastName_lastVisitAt_idx" ON "Patient"("tenantId", "firstName", "lastName", "lastVisitAt");
