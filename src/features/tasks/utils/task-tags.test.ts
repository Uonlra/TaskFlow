import { describe, expect, it } from "vitest";

import { formatTagsInput, parseTagsInput } from "@/features/tasks/utils/task-tags";

describe("parseTagsInput", () => {
  it("splits by English commas", () => {
    expect(parseTagsInput("设计,开发")).toEqual(["设计", "开发"]);
  });

  it("splits by Chinese commas", () => {
    expect(parseTagsInput("设计，开发")).toEqual(["设计", "开发"]);
  });

  it("removes duplicate tags", () => {
    expect(parseTagsInput("设计，开发，设计")).toEqual(["设计", "开发"]);
  });

  it("filters out empty items", () => {
    expect(parseTagsInput("设计, ,开发")).toEqual(["设计", "开发"]);
  });

  it("trims whitespace around each tag", () => {
    expect(parseTagsInput(" 设计 , 开发 ")).toEqual(["设计", "开发"]);
  });

  it("returns an empty array for empty or missing input", () => {
    expect(parseTagsInput("")).toEqual([]);
    expect(parseTagsInput(undefined)).toEqual([]);
  });
});

describe("formatTagsInput", () => {
  it("joins tags with Chinese commas", () => {
    expect(formatTagsInput(["设计", "开发"])).toBe("设计，开发");
  });

  it("returns an empty string when no tags are provided", () => {
    expect(formatTagsInput(undefined)).toBe("");
    expect(formatTagsInput([])).toBe("");
  });
});
