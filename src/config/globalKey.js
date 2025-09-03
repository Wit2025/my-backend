import dotenv from "dotenv";
dotenv.config();

export const PORT = process.env.PORT;
export const HOST = process.env.HOST;
export const USER = process.env.USER;
export const PASSWORD = process.env.PASSWORD || "";
export const DATABASE_NAME = process.env.DATABASE_NAME;
export const SECRETE_KEY = process.env.SECRETE_KEY;
export const SECRETE_KEY_REFRESH = process.env.SECRETE_KEY_REFRESH;
