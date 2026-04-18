import { db, setupDb } from "./setup.js";

type TableCount = {
  table_name: string;
  total: number;
};

setupDb();

const showcaseCleanupStatements = [
  "DELETE FROM saved_rooms WHERE roomId IN (SELECT id FROM rooms WHERE id LIKE 'showcase-room-%')",
  "DELETE FROM messages WHERE roomId IN (SELECT id FROM rooms WHERE id LIKE 'showcase-room-%')",
  "DELETE FROM messages WHERE senderId LIKE 'showcase-%' OR receiverId LIKE 'showcase-%'",
  "DELETE FROM reviews WHERE roomId IN (SELECT id FROM rooms WHERE id LIKE 'showcase-room-%') OR id LIKE 'showcase-review-%'",
  "DELETE FROM services WHERE id LIKE 'showcase-service-%'",
  "DELETE FROM rooms WHERE id LIKE 'showcase-room-%'",
  "DELETE FROM users WHERE id LIKE 'showcase-%' AND email != 'services.curated@bachelorrooms.local'",
] as const;

for (const statement of showcaseCleanupStatements) {
  db.prepare(statement).run();
}

const counts = db
  .prepare(
    `
      SELECT 'users' as table_name, COUNT(*) as total FROM users
      UNION ALL
      SELECT 'rooms' as table_name, COUNT(*) as total FROM rooms
      UNION ALL
      SELECT 'services' as table_name, COUNT(*) as total FROM services
      UNION ALL
      SELECT 'reviews' as table_name, COUNT(*) as total FROM reviews
    `
  )
  .all() as TableCount[];

console.log("Seed cleanup complete.");
for (const row of counts) {
  console.log(`${row.table_name}: ${row.total}`);
}
