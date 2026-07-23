import "@testing-library/jest-dom"
import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"

import Footer from "./Footer"

test("footer exposes only implemented application destinations", () => {
  render(
    <MemoryRouter>
      <Footer />
    </MemoryRouter>
  )

  expect(screen.getByRole("link", { name: "Contact Us" })).toHaveAttribute(
    "href",
    "/contact"
  )
  expect(screen.getByRole("link", { name: "Web Development" })).toHaveAttribute(
    "href",
    "/catalog/web-development"
  )
  expect(screen.getByRole("link", { name: "AI Learning Hub" })).toHaveAttribute(
    "href",
    "/dashboard/ai-learning"
  )

  const allowed = /^\/($|about$|contact$|signup$|login$|catalog\/|dashboard\/)/
  screen.getAllByRole("link").forEach((link) => {
    expect(link.getAttribute("href")).toMatch(allowed)
  })
})
