import { config } from "dotenv";
config({ path: ".env.development" });
console.log("Token from .env.development:", process.env.HASS_TOKEN);
