import { db } from "./setup.js";
import crypto from "crypto";

const admin = db.prepare("SELECT id FROM users WHERE role = 'admin' LIMIT 1").get() as { id: string };
if (!admin) {
  console.error("Admin user not found");
  process.exit(1);
}

const ownerId = admin.id;

const cities = [
  { name: "Nashik", lat: 19.9975, lng: 73.7898 },
  { name: "Pune", lat: 18.5204, lng: 73.8567 },
  { name: "Mumbai", lat: 19.0760, lng: 72.8777 }
];

const types = ["Single Room", "Shared Room", "PG", "Hostel", "Studio Apartment"];
const amenitiesList = ["Wifi", "AC", "Laundry", "Parking", "CCTV", "Power Backup"];

const insert = db.prepare(`
  INSERT INTO rooms (id, title, description, price, deposit, location, city, type, images, amenities, ownerId, lat, lng, isFeatured)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

for (const city of cities) {
  console.log(`Seeding 20 rooms for ${city.name}...`);
  for (let i = 1; i <= 20; i++) {
    const id = `seed-${city.name.toLowerCase()}-${i}-${crypto.randomBytes(4).toString("hex")}`;
    const title = `Premium ${types[i % types.length]} in ${city.name} #${i}`;
    const description = `A beautiful and well-maintained ${types[i % types.length]} located in the heart of ${city.name}. Perfect for students and professionals.`;
    const price = 5000 + Math.floor(Math.random() * 15000);
    const deposit = price * 2;
    const location = `${100 + i}, MG Road, ${city.name}`;
    const type = types[i % types.length];
    const images = JSON.stringify([
      `https://picsum.photos/seed/room-${city.name}-${i}/800/600`,
      `https://picsum.photos/seed/room-${city.name}-${i}-2/800/600`
    ]);
    const amenities = JSON.stringify(amenitiesList.sort(() => 0.5 - Math.random()).slice(0, 3));
    
    // Randomize coordinates within ~5km
    const lat = city.lat + (Math.random() - 0.5) * 0.05;
    const lng = city.lng + (Math.random() - 0.5) * 0.05;
    const isFeatured = i <= 5 ? 1 : 0;

    insert.run(id, title, description, price, deposit, location, city.name, type, images, amenities, ownerId, lat, lng, isFeatured);
  }
}

console.log("Seeding completed!");
process.exit(0);
