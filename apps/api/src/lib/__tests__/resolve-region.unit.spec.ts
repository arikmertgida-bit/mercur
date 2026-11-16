import { pickOneRegionPerCurrency } from "../resolve-region"

describe("pickOneRegionPerCurrency", () => {
  it("keeps every region whose currency is unique", () => {
    expect(
      pickOneRegionPerCurrency([
        { id: "reg_b", currency_code: "eur" },
        { id: "reg_a", currency_code: "try" },
      ])
    ).toEqual([
      { id: "reg_a", currency_code: "try" },
      { id: "reg_b", currency_code: "eur" },
    ])
  })

  it("keeps only the oldest region of a shared currency", () => {
    expect(
      pickOneRegionPerCurrency([
        { id: "reg_02", currency_code: "eur" },
        { id: "reg_01", currency_code: "eur" },
        { id: "reg_03", currency_code: "try" },
      ])
    ).toEqual([
      { id: "reg_01", currency_code: "eur" },
      { id: "reg_03", currency_code: "try" },
    ])
  })

  it("returns nothing when there is no region", () => {
    expect(pickOneRegionPerCurrency([])).toEqual([])
  })
})
