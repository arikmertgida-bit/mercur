import { isSafeSvg, matchesAllowedAdminMediaContent } from "../file-validation"

const svg = (body: string): Buffer => Buffer.from(body, "utf8")

const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
  "base64"
)

describe("admin media content", () => {
  it("accepts raster images by their bytes", () => {
    expect(matchesAllowedAdminMediaContent(PNG)).toBe(true)
  })

  it("accepts plain drawing SVGs", () => {
    expect(
      isSafeSvg(
        svg(
          '<?xml version="1.0"?>\n<!-- icon -->\n<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><defs><linearGradient id="g"/></defs><path fill="url(#g)" d="M0 0h24v24H0z"/><use href="#g"/></svg>'
        )
      )
    ).toBe(true)
  })

  it.each([
    ['<svg><script>alert(1)</script></svg>'],
    ['<svg onload="alert(1)"></svg>'],
    ['<svg><a href="javascript:alert(1)"><path/></a></svg>'],
    ['<svg><foreignObject><iframe src="x"/></foreignObject></svg>'],
    ['<svg><animate attributeName="href" values="&#106;avascript:alert(1)"/></svg>'],
    ['<!DOCTYPE svg [<!ENTITY x "y">]><svg>&x;</svg>'],
    ["<html><body>not an svg</body></html>"],
  ])("rejects active or non-SVG markup: %s", (body) => {
    expect(matchesAllowedAdminMediaContent(svg(body))).toBe(false)
  })

  it("rejects binary content", () => {
    expect(matchesAllowedAdminMediaContent(Buffer.from([0x00, 0x3c, 0x73, 0x76, 0x67]))).toBe(false)
  })
})
