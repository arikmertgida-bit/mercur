import type { StaticCountry } from "@lib/data/countries"

const acceptedOrderKeys = ["name", "code"]

/**
 * Since countries cannot be retrieved from the API, we need to create a hook
 * that can be used to filter and sort the static list of countries.
 */
export const useCountries = ({
  countries,
  q,
  order = "name",
  limit,
  offset = 0,
}: {
  countries: StaticCountry[]
  limit: number
  offset?: number
  order?: string
  q?: string
}) => {
  const data = countries.slice(offset, offset + limit)

  if (order) {
    const direction = order.startsWith("-") ? -1 : 1
    const key = order.replace("-", "")

    if (!acceptedOrderKeys.includes(key)) {
      throw new Response(
        JSON.stringify(`The key ${key} is not a valid order key`),
        { status: 500, headers: { "Content-Type": "application/json" } }
      )
    }

    // Static countries always carry both sort keys as strings.
    const sortKey: "iso_2" | "name" = key === "code" ? "iso_2" : "name"

    data.sort((a, b) => (a[sortKey] > b[sortKey] ? direction : -direction))
  }

  if (q) {
    const query = q.toLowerCase()
    const results = countries.filter(
      (c) =>
        c.name.toLowerCase().includes(query) ||
        c.iso_2.toLowerCase().includes(query)
    )

    return {
      countries: results,
      count: results.length,
    }
  }

  return {
    countries: data,
    count: countries.length,
  }
}
