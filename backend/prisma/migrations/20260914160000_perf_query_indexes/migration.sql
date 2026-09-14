-- Dashboard events, RSVP filters, invitation/feed timelines
CREATE INDEX IF NOT EXISTS "Event_tenantId_date_idx" ON "Event"("tenantId", "date");
CREATE INDEX IF NOT EXISTS "Guest_eventId_rsvp_idx" ON "Guest"("eventId", "rsvp");
CREATE INDEX IF NOT EXISTS "Invitation_eventId_createdAt_idx" ON "Invitation"("eventId", "createdAt");
CREATE INDEX IF NOT EXISTS "EventPost_eventId_createdAt_idx" ON "EventPost"("eventId", "createdAt");
