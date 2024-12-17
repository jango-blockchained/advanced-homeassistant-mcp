import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export const HASS_CONFIG = {
    BASE_URL: process.env.HASS_HOST || 'http://homeassistant.local:8123',
    TOKEN: process.env.HASS_TOKEN || '',
    SOCKET_URL: process.env.HASS_SOCKET_URL || '',
    SOCKET_TOKEN: process.env.HASS_SOCKET_TOKEN || '',
}; 