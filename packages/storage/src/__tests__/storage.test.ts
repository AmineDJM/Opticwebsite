import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { LocalStorageDriver } from "../local";
import { safeKey } from "../types";

describe("safeKey", () => {
  it("strips traversal", () => {
    expect(safeKey("a/b/c.png")).toBe("a/b/c.png");
    expect(() => safeKey("../../etc/passwd")).toThrow();
  });
  it("collapses slashes and leading slash", () => {
    expect(safeKey("/a//b")).toBe("a/b");
  });
});

describe("LocalStorageDriver", () => {
  let dir: string;
  let driver: LocalStorageDriver;
  beforeAll(async () => {
    dir = await mkdtemp(join(tmpdir(), "optic-storage-"));
    driver = new LocalStorageDriver(dir, "/media");
  });
  afterAll(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("puts, gets, lists and deletes", async () => {
    const obj = await driver.put("products/a.txt", Buffer.from("hello"), { contentType: "text/plain" });
    expect(obj.url).toBe("/media/products/a.txt");
    expect((await driver.get("products/a.txt")).toString()).toBe("hello");
    expect(await driver.exists("products/a.txt")).toBe(true);
    const list = await driver.list("products");
    expect(list).toContain("products/a.txt");
    await driver.delete("products/a.txt");
    expect(await driver.exists("products/a.txt")).toBe(false);
  });

  it("refuses path traversal on put", async () => {
    await expect(driver.put("../escape.txt", Buffer.from("x"))).rejects.toThrow();
  });
});
