import React from "react"
import { Link } from "react-router-dom"

export const handleHashNavigation = (event, destination) => {
  if (
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  ) {
    return
  }

  const target = document.getElementById(destination.slice(1))
  if (!target) return

  event.preventDefault()
  if (window.location.hash === destination) {
    window.history.replaceState(null, "", destination)
  } else {
    window.history.pushState(null, "", destination)
  }

  try {
    target.focus({ preventScroll: true })
  } catch {
    target.focus()
  }
  target.scrollIntoView({
    behavior: window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
      ? "auto"
      : "smooth",
    block: "start",
  })
}

const Button = ({ children, active, linkto }) => {
  const className = `inline-flex max-w-full items-center justify-center rounded-md px-6 py-3 text-center text-[13px] font-bold leading-6 shadow-[2px_2px_0px_0px_rgba(255,255,255,0.18)] transition-all duration-200 hover:scale-95 hover:shadow-none sm:text-[16px] ${
    active ? "bg-yellow-50 text-black" : "bg-richblack-800"
  }`

  if (linkto.startsWith("#")) {
    return (
      <a
        href={linkto}
        onClick={(event) => handleHashNavigation(event, linkto)}
        className={className}
      >
        {children}
      </a>
    )
  }

  return (
    <Link to={linkto} className={className}>
      {children}
    </Link>
  )
}

export default Button
