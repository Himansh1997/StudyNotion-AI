import "@testing-library/jest-dom"
import { fireEvent, render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"

import Button from "./Button"

afterEach(() => {
  window.history.replaceState(null, "", "/")
})

test("hash destinations update history, focus the section, and scroll smoothly", () => {
  const pushState = jest.spyOn(window.history, "pushState")
  const scrollIntoView = jest.fn()

  render(
    <MemoryRouter>
      <Button active linkto="#how-it-works">
        Learn More
      </Button>
      <section id="how-it-works" tabIndex={-1}>
        How it works
      </section>
    </MemoryRouter>
  )

  const target = document.getElementById("how-it-works")
  target.scrollIntoView = scrollIntoView
  fireEvent.click(screen.getByRole("link", { name: "Learn More" }))

  expect(pushState).toHaveBeenCalledWith(null, "", "#how-it-works")
  expect(window.location.hash).toBe("#how-it-works")
  expect(target).toHaveFocus()
  expect(scrollIntoView).toHaveBeenCalledWith({
    behavior: "smooth",
    block: "start",
  })
  pushState.mockRestore()
})

test("normal destinations remain React Router links", () => {
  render(
    <MemoryRouter>
      <Button active={false} linkto="/contact">
        Book a Demo
      </Button>
    </MemoryRouter>
  )

  expect(screen.getByRole("link", { name: "Book a Demo" })).toHaveAttribute(
    "href",
    "/contact"
  )
})
