import z from "zod"

export interface IStorage<T> {
  get(id: string): Promise<T | null>
  save(id: string, data: T): Promise<void>
  delete(id: string): Promise<void>
  list(): Promise<T[]>
}

export abstract class BaseStorage<T> implements IStorage<T> {
  constructor(
    protected schema: z.ZodType<T>,
    protected namespace: string,
  ) { }

  abstract get(id: string): Promise<T | null>
  abstract save(id: string, data: T): Promise<void>
  abstract delete(id: string): Promise<void>
  abstract list(): Promise<T[]>

  protected validate(data: unknown): T {
    return this.schema.parse(data);
  }
}
