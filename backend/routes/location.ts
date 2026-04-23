import express from "express";
import { db } from "../../database/setup.js";

const router = express.Router();

/**
 * Get location from IP
 * Uses ipapi.co as a free fallback. For production, consider a paid service or local GeoIP database.
 */
router.get("/ip", async (req, res) => {
  try {
    // In a real environment, we'd use req.ip or x-forwarded-for
    // For this demo/local environment, we'll try to fetch the public IP or use a default (Pune, India)
    const response = await fetch("https://ipapi.co/json/");
    const data = await response.json();
    
    if (data && data.latitude && data.longitude) {
      return res.json({
        lat: data.latitude,
        lng: data.longitude,
        city: data.city,
        region: data.region,
        country: data.country_name
      });
    }
    
    // Default fallback to Pune, India if IP detection fails
    res.json({
      lat: 18.5204,
      lng: 73.8567,
      city: "Pune",
      region: "Maharashtra",
      country: "India",
      isFallback: true
    });
  } catch (error) {
    res.json({
      lat: 18.5204,
      lng: 73.8567,
      city: "Pune",
      isFallback: true
    });
  }
});

/**
 * Geocoding search (Address to Lat/Lng)
 * Uses Nominatim (OpenStreetMap)
 */
router.get("/search", async (req, res) => {
  const { q } = req.query;
  if (!q) return res.status(400).json({ error: "Search query is required" });

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q as string)}&limit=1`,
      {
        headers: {
          "User-Agent": "Bachloroom-App/1.0"
        }
      }
    );
    const data = await response.json();

    if (data && data.length > 0) {
      const result = data[0];
      return res.json({
        lat: parseFloat(result.lat),
        lng: parseFloat(result.lon),
        display_name: result.display_name
      });
    }

    res.status(404).json({ error: "Location not found" });
  } catch (error) {
    res.status(500).json({ error: "Geocoding failed" });
  }
});

export default router;
