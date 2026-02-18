import { describe, expect, test } from "vitest";
import { listRoleSlugs, loadRole, loadRoleCatalog } from "./agentic";

describe("agentic role catalog", () => {
  test("listRoleSlugs returns known slugs", () => {
    const slugs = listRoleSlugs();
    expect(slugs.length).toBeGreaterThan(0);
    expect(slugs).toContain("devlead");
    expect(slugs).toContain("devrev");
    expect(slugs).toContain("secrev");
  });

  test("listRoleSlugs excludes README.md", () => {
    const slugs = listRoleSlugs();
    expect(slugs).not.toContain("README");
  });

  test("loadRole returns parsed role for valid slug", () => {
    const role = loadRole("devlead");
    expect(role).toBeDefined();
    expect(role?.slug).toBe("devlead");
    expect(role?.name).toBeTruthy();
    expect(role?.description).toBeTruthy();
    expect(role?.status).toBeTruthy();
    expect(role?.responsibilities.length).toBeGreaterThan(0);
    expect(role?.scope.length).toBeGreaterThan(0);
    expect(role?.does_not.length).toBeGreaterThan(0);
  });

  test("loadRole returns role with mindset for devlead", () => {
    const role = loadRole("devlead");
    expect(role?.mindset).toBeDefined();
    expect(role?.mindset?.focus.length).toBeGreaterThan(0);
    expect(role?.mindset?.principles.length).toBeGreaterThan(0);
  });

  test("loadRole returns role with escalations", () => {
    const role = loadRole("devlead");
    expect(role?.escalates_to.length).toBeGreaterThan(0);
    for (const e of role?.escalates_to ?? []) {
      expect(e.target).toBeTruthy();
      expect(e.when).toBeTruthy();
    }
  });

  test("loadRole returns undefined for nonexistent slug", () => {
    const role = loadRole("nonexistent-role");
    expect(role).toBeUndefined();
  });

  test("loadRoleCatalog returns all roles keyed by slug", () => {
    const catalog = loadRoleCatalog();
    expect(catalog.size).toBeGreaterThan(0);
    expect(catalog.has("devlead")).toBe(true);
    expect(catalog.has("devrev")).toBe(true);
    expect(catalog.has("secrev")).toBe(true);
    expect(catalog.get("devlead")?.slug).toBe("devlead");
  });
});
