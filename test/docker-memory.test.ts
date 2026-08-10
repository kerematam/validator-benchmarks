import { describe, expect, test } from "bun:test";
import {
  parseProcStatus,
  parseSmapsRollup,
} from "../src/benchmark/docker-memory-sample";

describe("Docker memory diagnostics", () => {
  test("parses Linux process RSS and high-water RSS", () => {
    const parsed = parseProcStatus(`Name:\tbun
VmHWM:\t  456 kB
VmRSS:\t  321 kB
`);

    expect(parsed).toEqual({
      rssBytes: 321 * 1_024,
      highWaterRssBytes: 456 * 1_024,
    });
  });

  test("parses PSS and sums private smaps memory", () => {
    const parsed = parseSmapsRollup(`Rss:                900 kB
Pss:                700 kB
Private_Clean:      100 kB
Private_Dirty:      200 kB
Private_Hugetlb:     10 kB
`);

    expect(parsed).toEqual({
      pssBytes: 700 * 1_024,
      privateBytes: 310 * 1_024,
    });
  });

  test("returns null for unavailable process fields", () => {
    expect(parseProcStatus("Name:\tbun\n")).toEqual({
      rssBytes: null,
      highWaterRssBytes: null,
    });
    expect(parseSmapsRollup("Rss: 10 kB\n")).toEqual({
      pssBytes: null,
      privateBytes: null,
    });
  });
});
