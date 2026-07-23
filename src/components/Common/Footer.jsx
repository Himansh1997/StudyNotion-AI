import { Link } from "react-router-dom"

import Logo from "../../assets/Logo/Logo-Full-Light.png"

const footerGroups = [
  {
    title: "Company",
    links: [
      { title: "Home", to: "/" },
      { title: "About Us", to: "/about" },
      { title: "Contact Us", to: "/contact" },
    ],
  },
  {
    title: "Popular categories",
    links: [
      { title: "Web Development", to: "/catalog/web-development" },
      { title: "Programming", to: "/catalog/programming" },
      { title: "Data Science", to: "/catalog/data-science" },
      { title: "AI & Machine Learning", to: "/catalog/ai-&-machine-learning" },
      { title: "Cloud & DevOps", to: "/catalog/cloud-&-devops" },
      { title: "Cyber Security", to: "/catalog/cyber-security" },
    ],
  },
  {
    title: "Get started",
    links: [
      { title: "Create an account", to: "/signup" },
      { title: "Log in", to: "/login" },
      { title: "Student dashboard", to: "/dashboard/enrolled-courses" },
      { title: "AI Learning Hub", to: "/dashboard/ai-learning" },
    ],
  },
]

const Footer = () => (
  <footer className="bg-richblack-800 text-richblack-300">
    <div className="mx-auto grid w-11/12 max-w-maxContent gap-10 border-b border-richblack-700 py-14 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
      <div>
        <Link to="/" aria-label="StudyNotion home">
          <img src={Logo} alt="StudyNotion" className="w-40 object-contain" />
        </Link>
        <p className="mt-4 max-w-sm text-sm leading-6">
          Learn practical technology skills with structured courses, progress
          tracking, secure enrollment, and AI-powered study tools.
        </p>
      </div>

      {footerGroups.map((group) => (
        <nav key={group.title} aria-label={`${group.title} links`}>
          <h2 className="font-semibold text-richblack-50">{group.title}</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {group.links.map((link) => (
              <li key={link.to}>
                <Link
                  to={link.to}
                  className="transition-colors hover:text-richblack-50"
                >
                  {link.title}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      ))}
    </div>

    <div className="mx-auto flex w-11/12 max-w-maxContent flex-col justify-between gap-2 py-6 text-sm sm:flex-row">
      <span>© {new Date().getFullYear()} StudyNotion</span>
      <span>Built for practical, outcome-focused learning.</span>
    </div>
  </footer>
)

export default Footer
