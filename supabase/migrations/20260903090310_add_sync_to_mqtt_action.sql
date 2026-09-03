ALTER TABLE widgets DROP CONSTRAINT widgets_mqtt_action_check;
ALTER TABLE widgets ADD CONSTRAINT widgets_mqtt_action_check CHECK (mqtt_action IN ('SUBSCRIBE', 'PUBLISH', 'SYNC'));
