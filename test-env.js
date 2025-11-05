import { config } from "dotenv";
config();
console.log("Token from env:", process.env.HASS_TOKEN);
console.log("Token length:", process.env.HASS_TOKEN?.length || 0);
