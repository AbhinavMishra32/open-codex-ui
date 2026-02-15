import * as fs from "fs/promises";
import * as path from "path";
import z from "zod";
import { BaseStorage } from "./storage.js";

export class FileStorage<T> extends BaseStorage<T> {
  private basePath: string;

  constructor(schema: z.ZodType<T>, namespace: string, basePath: string = "./.data") {
    super(schema, namespace);
    this.basePath = path.join(basePath, namespace);
  }

  async get(id: string): Promise<T | null> {
    const filepath = this.getPath(id);

    try {
      const raw = await fs.readFile(filepath, "utf-8");
      return this.validate(JSON.parse(raw));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return null;
      }
      throw error;
    }
  }

  async save(id: string, data: T): Promise<void> {
    const validated = this.validate(data);
    const filepath = this.getPath(id);

    await fs.mkdir(this.basePath, { recursive: true });
    await fs.writeFile(filepath, JSON.stringify(validated, null, 2), "utf-8");
  }

  async delete(id: string): Promise<void> {
    const filepath = this.getPath(id);
    await fs.unlink(filepath).catch(() => { });
  }

  async list(): Promise<T[]> {
    try {
      const files = await fs.readdir(this.basePath);
      const items = (await Promise.all(
        files.filter((f) => f.endsWith(".json")).map((f) => this.get(path.basename(f, ".json"))),
      )) as (T | null)[];
      return items.filter((item): item is T => item !== null);
    } catch {
      return [];
    }
  }

  private getPath(id: string): string {
    return path.join(this.basePath, `${id}.json`);
  }

} 
