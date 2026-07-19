const sharedInstructions = [
  "A laptop with a stable internet connection",
  "No prior professional experience is required",
  "Practice each lesson by completing the suggested project task",
]

const lesson = (title, timeDuration, description) => ({
  title,
  timeDuration: String(timeDuration),
  description,
})

const demoCatalog = [
  {
    slug: "complete-web-development-bootcamp",
    courseName: "Complete Web Development Bootcamp 2026",
    category: "Web Development",
    categoryDescription: "Build responsive, accessible, and production-ready applications for the web.",
    price: 1999,
    tag: ["HTML", "CSS", "JavaScript", "Full Stack"],
    courseDescription:
      "A project-first path from semantic HTML and modern CSS to JavaScript, APIs, Node.js, and deployment. Build a portfolio of responsive applications while learning the engineering practices used by professional teams.",
    whatYouWillLearn:
      "Create responsive interfaces, write modern JavaScript, consume REST APIs, build Express services, connect MongoDB, authenticate users, and deploy a full-stack application.",
    instructions: sharedInstructions,
    sections: [
      {
        name: "Modern Web Foundations",
        lessons: [
          lesson("How the web works", 620, "Understand browsers, servers, HTTP, DNS, and the request lifecycle."),
          lesson("Semantic HTML and accessibility", 780, "Structure pages that work for users, search engines, and assistive technology."),
          lesson("Responsive CSS systems", 900, "Build flexible layouts with Grid, Flexbox, variables, and mobile-first breakpoints."),
        ],
      },
      {
        name: "JavaScript in Practice",
        lessons: [
          lesson("JavaScript essentials", 840, "Use values, functions, arrays, objects, and modules with confidence."),
          lesson("DOM, events, and browser APIs", 760, "Create interactive experiences and manage browser state."),
          lesson("Async JavaScript and REST APIs", 920, "Work with promises, async/await, fetch, errors, and external APIs."),
        ],
      },
      {
        name: "Full-Stack Capstone",
        lessons: [
          lesson("Node.js and Express architecture", 940, "Design routes, controllers, middleware, and validation."),
          lesson("MongoDB, authentication, and security", 1020, "Model application data and protect user sessions and secrets."),
          lesson("Testing and production deployment", 880, "Validate the application and deploy a reliable frontend and API."),
        ],
      },
    ],
  },
  {
    slug: "react-nextjs-production-apps",
    courseName: "React & Next.js: Production Apps",
    category: "Web Development",
    categoryDescription: "Build responsive, accessible, and production-ready applications for the web.",
    price: 1799,
    tag: ["React", "Next.js", "Frontend", "Performance"],
    courseDescription:
      "Master component architecture, state, routing, data fetching, performance, and production delivery through a complete modern React application.",
    whatYouWillLearn:
      "Design reusable components, manage client and server state, build accessible forms, optimize rendering, test critical flows, and ship a production-grade React application.",
    instructions: sharedInstructions,
    sections: [
      {
        name: "React Architecture",
        lessons: [
          lesson("Thinking in components", 680, "Turn product requirements into maintainable component boundaries."),
          lesson("Hooks and predictable state", 820, "Use state, effects, reducers, and context without common lifecycle bugs."),
          lesson("Reusable UI and accessibility", 760, "Create composable interfaces with keyboard and screen-reader support."),
        ],
      },
      {
        name: "Application Data",
        lessons: [
          lesson("Routing and layouts", 720, "Organize pages, nested layouts, loading states, and navigation."),
          lesson("Data fetching and caching", 900, "Coordinate server data, mutations, caching, and error recovery."),
          lesson("Forms and authentication", 840, "Build validated forms and secure authenticated experiences."),
        ],
      },
      {
        name: "Production Readiness",
        lessons: [
          lesson("Rendering and performance", 860, "Measure and improve rendering, bundles, images, and Core Web Vitals."),
          lesson("Testing user journeys", 760, "Test components and the workflows that matter most to users."),
          lesson("Deployment and observability", 740, "Ship safely with environment configuration, logs, and release checks."),
        ],
      },
    ],
  },
  {
    slug: "dsa-javascript-interview-mastery",
    courseName: "Data Structures & Algorithms in JavaScript",
    category: "Programming",
    categoryDescription: "Strengthen programming fundamentals, problem solving, and interview readiness.",
    price: 1499,
    tag: ["DSA", "JavaScript", "Interviews", "Problem Solving"],
    courseDescription:
      "Develop a repeatable approach to coding problems and master the data structures, patterns, and complexity analysis expected in technical interviews.",
    whatYouWillLearn:
      "Analyze time and space complexity, recognize common problem patterns, implement core data structures, and communicate clear solutions in interviews.",
    instructions: sharedInstructions,
    sections: [
      {
        name: "Problem-Solving Foundations",
        lessons: [
          lesson("Complexity and trade-offs", 700, "Compare solutions using Big O time and space analysis."),
          lesson("Arrays, strings, and hash maps", 900, "Solve lookup, counting, grouping, and substring problems."),
          lesson("Two pointers and sliding windows", 840, "Recognize and apply high-value linear-time patterns."),
        ],
      },
      {
        name: "Core Data Structures",
        lessons: [
          lesson("Stacks, queues, and linked lists", 900, "Implement and apply sequential data structures."),
          lesson("Trees and binary search", 960, "Traverse, search, and reason about hierarchical structures."),
          lesson("Graphs and traversal", 980, "Model relationships and use breadth-first and depth-first search."),
        ],
      },
      {
        name: "Advanced Interview Patterns",
        lessons: [
          lesson("Recursion and backtracking", 940, "Explore decision trees and construct candidate solutions."),
          lesson("Dynamic programming", 1080, "Turn overlapping subproblems into efficient solutions."),
          lesson("Mock interview strategy", 720, "Clarify, plan, code, test, and communicate under interview conditions."),
        ],
      },
    ],
  },
  {
    slug: "python-data-science-ai",
    courseName: "Python for Data Science & AI",
    category: "Data Science",
    categoryDescription: "Turn data into reliable analysis, visual insight, and intelligent applications.",
    price: 1899,
    tag: ["Python", "Pandas", "Data Analysis", "AI"],
    courseDescription:
      "Learn practical Python through notebooks, real datasets, exploratory analysis, visualization, and a first intelligent data product.",
    whatYouWillLearn:
      "Write clear Python, transform datasets with Pandas, visualize findings, evaluate data quality, automate analysis, and prepare features for machine learning.",
    instructions: sharedInstructions,
    sections: [
      {
        name: "Python for Analysis",
        lessons: [
          lesson("Python essentials for data work", 840, "Use collections, functions, modules, and environments productively."),
          lesson("NumPy and vectorized thinking", 780, "Work efficiently with numerical arrays and broadcasting."),
          lesson("Pandas data wrangling", 1020, "Load, clean, join, reshape, and aggregate real datasets."),
        ],
      },
      {
        name: "Insight and Communication",
        lessons: [
          lesson("Exploratory data analysis", 900, "Ask useful questions and investigate distributions and relationships."),
          lesson("Data visualization", 840, "Choose effective charts and communicate evidence clearly."),
          lesson("Data quality and reproducibility", 760, "Validate inputs and create analysis others can repeat."),
        ],
      },
      {
        name: "Applied AI Workflow",
        lessons: [
          lesson("Feature preparation", 820, "Encode, scale, split, and prepare data without leakage."),
          lesson("Your first predictive model", 940, "Train and evaluate a baseline model with appropriate metrics."),
          lesson("Delivering a data product", 780, "Package results into a clear, usable application workflow."),
        ],
      },
    ],
  },
  {
    slug: "machine-learning-foundations",
    courseName: "Machine Learning Foundations",
    category: "AI & Machine Learning",
    categoryDescription: "Build responsible machine-learning and generative-AI systems from first principles.",
    price: 2199,
    tag: ["Machine Learning", "Python", "Models", "MLOps"],
    courseDescription:
      "Understand how models learn, how to evaluate them honestly, and how to turn an experiment into a dependable machine-learning workflow.",
    whatYouWillLearn:
      "Frame ML problems, establish baselines, train supervised models, select meaningful metrics, reduce overfitting, explain results, and plan deployment monitoring.",
    instructions: sharedInstructions,
    sections: [
      {
        name: "Modeling Foundations",
        lessons: [
          lesson("Framing machine-learning problems", 760, "Translate product questions into measurable prediction tasks."),
          lesson("Regression and classification", 980, "Train and compare foundational supervised-learning models."),
          lesson("Metrics that match the goal", 840, "Choose evaluation metrics that reflect real-world costs."),
        ],
      },
      {
        name: "Reliable Experiments",
        lessons: [
          lesson("Validation and leakage", 880, "Design honest experiments and prevent information leakage."),
          lesson("Feature engineering", 900, "Create useful signals while keeping pipelines reproducible."),
          lesson("Tuning and regularization", 940, "Improve generalization without overfitting the validation set."),
        ],
      },
      {
        name: "From Model to Product",
        lessons: [
          lesson("Interpretability and fairness", 820, "Explain model behavior and assess important risks."),
          lesson("Serving predictions", 780, "Design a simple API and inference pipeline."),
          lesson("Monitoring model quality", 760, "Track drift, data health, latency, and business outcomes."),
        ],
      },
    ],
  },
  {
    slug: "mern-stack-saas",
    courseName: "MERN Stack: Build & Deploy a SaaS",
    category: "Web Development",
    categoryDescription: "Build responsive, accessible, and production-ready applications for the web.",
    price: 2299,
    tag: ["MongoDB", "Express", "React", "Node.js"],
    courseDescription:
      "Build a secure multi-user SaaS product with a React frontend, Express API, MongoDB data model, payments, media uploads, and cloud deployment.",
    whatYouWillLearn:
      "Design a MERN architecture, implement role-based authentication, model business data, integrate payments and media, test APIs, and deploy frontend and backend services.",
    instructions: sharedInstructions,
    sections: [
      {
        name: "Product Architecture",
        lessons: [
          lesson("From requirements to architecture", 760, "Define boundaries, data flow, roles, and deployment topology."),
          lesson("MongoDB schema design", 900, "Model relationships, indexes, validation, and lifecycle rules."),
          lesson("Express API foundations", 880, "Build consistent routes, controllers, services, and errors."),
        ],
      },
      {
        name: "Secure Product Features",
        lessons: [
          lesson("Authentication and authorization", 980, "Protect accounts, tokens, resources, and role-specific actions."),
          lesson("React product workflows", 940, "Build dashboards, forms, optimistic updates, and resilient states."),
          lesson("Payments and media", 860, "Integrate checkout and cloud uploads with server-side verification."),
        ],
      },
      {
        name: "Ship the SaaS",
        lessons: [
          lesson("API and security testing", 900, "Test success paths, failures, ownership, and abuse controls."),
          lesson("Cloud deployment", 780, "Configure domains, environments, CORS, builds, and health checks."),
          lesson("Production operations", 760, "Use logs, metrics, backups, budgets, and incident checklists."),
        ],
      },
    ],
  },
  {
    slug: "devops-docker-cicd-aws",
    courseName: "DevOps with Docker, CI/CD & AWS",
    category: "Cloud & DevOps",
    categoryDescription: "Automate software delivery and operate reliable services in the cloud.",
    price: 1999,
    tag: ["Docker", "CI/CD", "AWS", "DevOps"],
    courseDescription:
      "Move from manual deployments to repeatable delivery with containers, automated pipelines, cloud infrastructure, monitoring, and practical reliability habits.",
    whatYouWillLearn:
      "Containerize services, compose development environments, build CI/CD pipelines, manage cloud configuration, deploy safely, and monitor application health.",
    instructions: sharedInstructions,
    sections: [
      {
        name: "Containers and Environments",
        lessons: [
          lesson("Containers explained", 700, "Understand images, layers, registries, isolation, and runtime trade-offs."),
          lesson("Writing production Dockerfiles", 860, "Create small, secure, cache-friendly application images."),
          lesson("Local stacks with Compose", 780, "Run multi-service environments with networks, volumes, and health checks."),
        ],
      },
      {
        name: "Continuous Delivery",
        lessons: [
          lesson("Designing a CI pipeline", 800, "Automate formatting, tests, builds, and security checks."),
          lesson("Artifacts, secrets, and environments", 820, "Promote immutable releases without exposing credentials."),
          lesson("Safe deployment strategies", 860, "Compare rolling, blue-green, canary, and rollback workflows."),
        ],
      },
      {
        name: "Cloud Operations",
        lessons: [
          lesson("AWS deployment building blocks", 920, "Choose practical compute, storage, networking, and identity services."),
          lesson("Infrastructure and configuration", 840, "Make environments repeatable and changes reviewable."),
          lesson("Monitoring and incident response", 780, "Create useful signals, alerts, runbooks, and recovery checks."),
        ],
      },
    ],
  },
  {
    slug: "cybersecurity-essentials",
    courseName: "Cybersecurity Essentials for Developers",
    category: "Cyber Security",
    categoryDescription: "Design, build, and operate applications with security in every layer.",
    price: 1699,
    tag: ["Security", "OWASP", "APIs", "Threat Modeling"],
    courseDescription:
      "Learn the security mindset and practical controls developers need to protect accounts, APIs, data, dependencies, and production environments.",
    whatYouWillLearn:
      "Threat-model an application, prevent common web vulnerabilities, secure authentication and authorization, protect secrets, review dependencies, and respond to incidents.",
    instructions: sharedInstructions,
    sections: [
      {
        name: "Security Mindset",
        lessons: [
          lesson("Assets, threats, and trust boundaries", 720, "Identify what matters and how an attacker could reach it."),
          lesson("Practical threat modeling", 820, "Map data flows and prioritize realistic abuse cases."),
          lesson("Secure defaults and least privilege", 760, "Reduce attack surface through deliberate design choices."),
        ],
      },
      {
        name: "Web and API Defense",
        lessons: [
          lesson("Injection and input validation", 900, "Validate untrusted input and prevent command and database injection."),
          lesson("Authentication and access control", 940, "Protect identities, sessions, tokens, and resource ownership."),
          lesson("Browser and API protections", 860, "Apply CORS, CSRF, headers, rate limits, and safe error handling."),
        ],
      },
      {
        name: "Secure Delivery",
        lessons: [
          lesson("Secrets and dependency security", 800, "Keep credentials out of code and manage supply-chain risk."),
          lesson("Security testing", 820, "Combine automated checks with focused manual verification."),
          lesson("Logging and incident readiness", 760, "Capture useful evidence and prepare a responsible response process."),
        ],
      },
    ],
  },
]

module.exports = demoCatalog
