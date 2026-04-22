-- Add 'announcement' to notification_logs type check constraint
ALTER TABLE notification_logs DROP CONSTRAINT IF EXISTS notification_logs_type_check;
ALTER TABLE notification_logs ADD CONSTRAINT notification_logs_type_check
  CHECK (type IN (
    'booking_new', 'booking_confirmed', 'booking_declined', 'booking_cancelled',
    'message', 'reminder', 'review_request', 'staff_assigned', 'announcement'
  ));
