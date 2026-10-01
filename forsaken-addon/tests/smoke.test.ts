import { describe, expect, it } from "vitest";
import fs from "node:fs";

describe("project", () => {
  it("has a package.json with pinned Minecraft modules", () => {
    const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
    expect(pkg.dependencies["@minecraft/server"]).toBe("2.10.0");
    expect(pkg.dependencies["@minecraft/server-ui"]).toBe("2.2.0");
  });
});
