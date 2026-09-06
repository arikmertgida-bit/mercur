import {
  MAX_BACKFILL_DAYS,
  addDaysToDateString,
  resolveDatesToProcess,
} from "../compute-seller-analytics"

describe("addDaysToDateString", () => {
  it("adds days within the same month", () => {
    expect(addDaysToDateString("2026-09-04", 1)).toBe("2026-09-05")
  })

  it("rolls over a month boundary", () => {
    expect(addDaysToDateString("2026-09-30", 1)).toBe("2026-10-01")
  })

  it("rolls over a year boundary", () => {
    expect(addDaysToDateString("2026-12-31", 1)).toBe("2027-01-01")
  })

  it("handles a Feb 29 leap day", () => {
    expect(addDaysToDateString("2028-02-28", 1)).toBe("2028-02-29")
    expect(addDaysToDateString("2028-02-29", 1)).toBe("2028-03-01")
  })
})

describe("resolveDatesToProcess", () => {
  it("returns only today when nothing has ever been computed", () => {
    expect(resolveDatesToProcess(null, "2026-09-07")).toEqual(["2026-09-07"])
  })

  it("returns only today when the last computed row is already today (a same-day re-run)", () => {
    expect(resolveDatesToProcess("2026-09-07", "2026-09-07")).toEqual(["2026-09-07"])
  })

  it("backfills every day strictly between the last computed row and today", () => {
    // Reproduces the real gap this fix was written for: the job ran on
    // 09-03 and 09-05 but never on 09-04 (e.g. the process was down across
    // both of that day's 00:00/12:00 UTC cron windows), permanently
    // dropping a day that had real orders until this backfill exists.
    expect(resolveDatesToProcess("2026-09-05", "2026-09-07")).toEqual([
      "2026-09-06",
      "2026-09-07",
    ])
  })

  it("still returns today even if the last computed row is somehow after today", () => {
    expect(resolveDatesToProcess("2026-09-10", "2026-09-07")).toEqual(["2026-09-07"])
  })

  it("caps a very long gap to the most recent MAX_BACKFILL_DAYS days, always keeping today", () => {
    const today = "2026-09-07"
    const dates = resolveDatesToProcess("2025-01-01", today)

    expect(dates).toHaveLength(MAX_BACKFILL_DAYS)
    expect(dates[dates.length - 1]).toBe(today)
    expect(dates[0]).toBe(addDaysToDateString(today, -(MAX_BACKFILL_DAYS - 1)))
  })
})
