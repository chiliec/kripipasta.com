import mysql, { type Connection, type RowDataPacket } from "mysql2/promise";

export interface LegacyStory {
  id: number;
  title: string;
  intro: string;
  content: string;
  tags: string;
  create_time: number;
  approve_time: number;
  update_time: number;
  author_name: string;
  author_link: string;
  author_email: string;
  redactor: string;
  approved: number;
  counter: number;
  url: string;
  user_ip: string | null;
}

export interface LegacyRating {
  id: number;
  model_id: number;
  target_id: number;
  user: string;
  value: number;
}

export interface LegacyTag {
  id: number;
  name: string;
  frequency: number;
}

export const ARCHIVE_TABLES = ["kp_video", "kp_forum", "kp_film", "kp_image"] as const;

export function connectLegacy(): Promise<Connection> {
  return mysql.createConnection({
    host: "127.0.0.1",
    port: 3307,
    user: "root",
    password: "root",
    database: "kripipasta_db",
    charset: "utf8mb4",
  });
}

export async function readStories(c: Connection): Promise<LegacyStory[]> {
  const [rows] = await c.query<RowDataPacket[]>("SELECT * FROM kp_story");
  return rows as unknown as LegacyStory[];
}

export async function readStoryRatings(c: Connection): Promise<LegacyRating[]> {
  const [rows] = await c.query<RowDataPacket[]>(
    "SELECT * FROM kp_rating WHERE model_id = 0",
  );
  return rows as unknown as LegacyRating[];
}

export async function readTags(c: Connection): Promise<LegacyTag[]> {
  const [rows] = await c.query<RowDataPacket[]>("SELECT * FROM kp_tag");
  return rows as unknown as LegacyTag[];
}

export async function readArchive(
  c: Connection,
  table: (typeof ARCHIVE_TABLES)[number],
): Promise<Record<string, unknown>[]> {
  const [rows] = await c.query<RowDataPacket[]>(`SELECT * FROM ${table}`);
  return rows as Record<string, unknown>[];
}
