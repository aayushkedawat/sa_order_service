import { DataSource } from "typeorm";
import { config } from "dotenv";

config();

export default new DataSource({
  type: "postgres",
  url: process.env.DB_DSN,
  entities: ["src/**/*.entity.ts"],
  migrations: ["migrations/*.ts"],
  synchronize: false,
});
