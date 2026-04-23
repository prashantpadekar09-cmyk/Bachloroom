import { db } from "./setup.js";

const roomImages = [
  "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?q=80&w=2000",
  "https://images.unsplash.com/photo-1598928506311-c55ded91a20c?q=80&w=2000",
  "https://images.unsplash.com/photo-1505691723518-36a5ac3be353?q=80&w=2000",
  "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?q=80&w=2000",
  "https://images.unsplash.com/photo-1560185127-6ed189bf02f4?q=80&w=2000",
  "https://images.unsplash.com/photo-1513694203232-719a280e022f?q=80&w=2000",
  "https://images.unsplash.com/photo-1493809842364-78817add7ffb?q=80&w=2000",
  "https://images.unsplash.com/photo-1536376074432-8f274fa42657?q=80&w=2000",
  "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?q=80&w=2000",
  "https://images.unsplash.com/photo-1484154218962-a197022b5858?q=80&w=2000",
  "https://images.unsplash.com/photo-1554995207-c18c203602cb?q=80&w=2000",
  "https://images.unsplash.com/photo-1499916078039-922301b0eb9b?q=80&w=2000",
  "https://images.unsplash.com/photo-1501183638710-841dd1904471?q=80&w=2000",
  "https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?q=80&w=2000",
  "https://images.unsplash.com/photo-1464890100898-a385f744067f?q=80&w=2000",
  "https://images.unsplash.com/photo-1512918766671-ed6a9980ae11?q=80&w=2000",
  "https://images.unsplash.com/photo-1507089947368-19c1da9775ae?q=80&w=2000",
  "https://images.unsplash.com/photo-1432303492674-642e9d0944b2?q=80&w=2000",
  "https://images.unsplash.com/photo-1524758631624-e2822e304c36?q=80&w=2000",
  "https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?q=80&w=2000"
];

const rooms = db.prepare("SELECT id FROM rooms").all() as { id: string }[];

const updateStmt = db.prepare("UPDATE rooms SET images = ? WHERE id = ?");

console.log(`Updating ${rooms.length} rooms with real photos...`);

rooms.forEach((room, index) => {
  // Pick 2-3 unique images for each room
  const shuffled = [...roomImages].sort(() => 0.5 - Math.random());
  const selected = shuffled.slice(0, 3);
  updateStmt.run(JSON.stringify(selected), room.id);
});

console.log("Update completed successfully!");
process.exit(0);
