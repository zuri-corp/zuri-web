export const marketplaceCategories = [
  {
    "id": "ai",
    "name": "AI & automation",
    "description": "Draft, research and automate a useful part of your day."
  },
  {
    "id": "money",
    "name": "Money & accounts",
    "description": "Keep clearer records and make the business admin easier."
  },
  {
    "id": "teamwork",
    "name": "Teamwork",
    "description": "Give your team a clearer place to communicate and get work done."
  },
  {
    "id": "create",
    "name": "Design & marketing",
    "description": "Make your work look considered, then help it reach people."
  },
  {
    "id": "web",
    "name": "Web & security",
    "description": "Publish, sell and protect the foundations of your online presence."
  }
] as const;

export const technologyProducts = [
  {
    "id": "chatgpt",
    "name": "ChatGPT",
    "category": "ai",
    "title": "Think, draft and create.",
    "description": "An AI assistant for writing, analysis, learning and creative tasks.",
    "help": "Practical prompts, team guidance and a workflow with human review.",
    "url": "https://chatgpt.com/overview/",
    "goal": "ai",
    "service": "ai-automation",
    "image": "/photos/computer-circuits.jpg",
    "logo": "/brands/tools/chatgpt.webp"
  },
  {
    "id": "claude",
    "name": "Claude",
    "category": "ai",
    "title": "Work through the complex parts.",
    "description": "An AI assistant for writing, coding and working with documents.",
    "help": "Organise project context and turn recurring tasks into useful workflows.",
    "url": "https://claude.com/product/overview",
    "goal": "ai",
    "service": "ai-automation",
    "image": "/photos/computer-circuits.jpg",
    "logo": "/brands/tools/claude.png"
  },
  {
    "id": "gemini",
    "name": "Google Gemini",
    "category": "ai",
    "title": "Bring AI into your everyday work.",
    "description": "Google’s AI assistant for brainstorming, writing and understanding information.",
    "help": "Explore fit with your Google tools and practise responsible use.",
    "url": "https://gemini.google.com/",
    "goal": "ai",
    "service": "ai-automation",
    "image": "/photos/computer-circuits.jpg",
    "logo": "/brands/tools/gemini.png"
  },
  {
    "id": "perplexity",
    "name": "Perplexity",
    "category": "ai",
    "title": "Start research with sources.",
    "description": "An AI-powered search and research tool with source-linked answers.",
    "help": "Build a research routine and verify the sources behind an answer.",
    "url": "https://www.perplexity.ai/",
    "goal": "ai",
    "service": "ai-automation",
    "image": "/photos/computer-circuits.jpg",
    "logo": "/brands/tools/perplexity.ico"
  },
  {
    "id": "zapier",
    "name": "Zapier",
    "category": "ai",
    "title": "Let your apps do the handover.",
    "description": "Connect apps and automate repeatable business workflows.",
    "help": "Map a process, connect the right accounts and test the automation.",
    "url": "https://zapier.com/",
    "goal": "ai",
    "service": "ai-automation",
    "image": "/photos/computer-circuits.jpg",
    "logo": "/brands/tools/zapier.ico"
  },
  {
    "id": "quickbooks",
    "name": "QuickBooks",
    "category": "money",
    "title": "Give your books a better home.",
    "description": "Accounting software for invoicing, expenses and financial reporting.",
    "help": "Plan your records, explore regional fit and get set up.",
    "url": "https://quickbooks.intuit.com/global/accounting-software/",
    "goal": "business-finances",
    "service": "business-technology",
    "image": "/photos/business-books.jpg",
    "logo": null
  },
  {
    "id": "xero",
    "name": "Xero",
    "category": "money",
    "title": "Keep the books connected.",
    "description": "Cloud accounting tools for invoicing, reconciliation and reporting.",
    "help": "Prepare a migration plan and agree a workflow with your accountant.",
    "url": "https://www.xero.com/",
    "goal": "business-finances",
    "service": "business-technology",
    "image": "/photos/business-books.jpg",
    "logo": "/brands/tools/xero.png"
  },
  {
    "id": "zoho-books",
    "name": "Zoho Books",
    "category": "money",
    "title": "Bring your financial admin together.",
    "description": "Online accounting software for invoices, expenses and business records.",
    "help": "Explore local requirements and configure an everyday bookkeeping workflow.",
    "url": "https://www.zoho.com/books/",
    "goal": "business-finances",
    "service": "business-technology",
    "image": "/photos/business-books.jpg",
    "logo": "/brands/tools/zoho-books.ico"
  },
  {
    "id": "freshbooks",
    "name": "FreshBooks",
    "category": "money",
    "title": "Spend less time chasing admin.",
    "description": "Invoicing and accounting tools for service businesses and independent work.",
    "help": "Set up client records, service invoices and a repeatable billing routine.",
    "url": "https://www.freshbooks.com/",
    "goal": "business-finances",
    "service": "business-technology",
    "image": "/photos/business-books.jpg",
    "logo": "/brands/tools/freshbooks.ico"
  },
  {
    "id": "wave",
    "name": "Wave",
    "category": "money",
    "title": "Start with simpler business records.",
    "description": "Accounting and invoicing tools, focused on businesses in the US and Canada.",
    "help": "Check regional eligibility first and compare it with locally suitable options.",
    "url": "https://www.waveapps.com/",
    "goal": "business-finances",
    "service": "business-technology",
    "image": "/photos/business-books.jpg",
    "logo": "/brands/tools/wave.png"
  },
  {
    "id": "notion",
    "name": "Notion",
    "category": "teamwork",
    "title": "One place for the moving parts.",
    "description": "Bring documents, projects and team knowledge into a shared workspace.",
    "help": "Workspace structure, useful templates and a clearer team handover.",
    "url": "https://www.notion.com/product",
    "goal": "work-better",
    "service": "business-technology",
    "image": "/photos/team-policy.jpg",
    "logo": "/brands/tools/notion.png"
  },
  {
    "id": "workspace",
    "name": "Google Workspace",
    "category": "teamwork",
    "title": "Your team. On the same page.",
    "description": "Business email, shared files, meetings and collaborative documents.",
    "help": "Domain email, account setup and a tidier way to work together.",
    "url": "https://workspace.google.com/",
    "goal": "work-better",
    "service": "business-technology",
    "image": "/photos/team-policy.jpg",
    "logo": "/brands/tools/workspace.png"
  },
  {
    "id": "slack",
    "name": "Slack",
    "category": "teamwork",
    "title": "Give conversations a useful home.",
    "description": "Team messaging with channels, shared conversations and integrations.",
    "help": "Design channels, set notifications and agree how your team communicates.",
    "url": "https://slack.com/",
    "goal": "work-better",
    "service": "business-technology",
    "image": "/photos/team-policy.jpg",
    "logo": "/brands/tools/slack.png"
  },
  {
    "id": "trello",
    "name": "Trello",
    "category": "teamwork",
    "title": "See what needs to happen next.",
    "description": "Visual boards, lists and cards for organising tasks and projects.",
    "help": "Turn your process into a simple board with clear ownership.",
    "url": "https://trello.com/",
    "goal": "work-better",
    "service": "business-technology",
    "image": "/photos/team-policy.jpg",
    "logo": "/brands/tools/trello.ico"
  },
  {
    "id": "asana",
    "name": "Asana",
    "category": "teamwork",
    "title": "Turn plans into owned actions.",
    "description": "Project and work management for tasks, timelines and team coordination.",
    "help": "Create a practical project structure and a routine for following through.",
    "url": "https://asana.com/",
    "goal": "work-better",
    "service": "business-technology",
    "image": "/photos/team-policy.jpg",
    "logo": "/brands/tools/asana.ico"
  },
  {
    "id": "canva",
    "name": "Canva",
    "category": "create",
    "title": "Make your next idea look the part.",
    "description": "A visual design workspace for presentations, social content and more.",
    "help": "Brand setup, reusable templates and practical team training.",
    "url": "https://www.canva.com/visual-suite/",
    "goal": "creative",
    "service": "digital-marketing",
    "image": "/photos/customer-work.jpg",
    "logo": "/brands/tools/canva.png"
  },
  {
    "id": "adobe-express",
    "name": "Adobe Express",
    "category": "create",
    "title": "Create useful content, consistently.",
    "description": "Design tools for social graphics, short videos and branded content.",
    "help": "Build templates and a manageable content-production routine.",
    "url": "https://www.adobe.com/express/",
    "goal": "creative",
    "service": "digital-marketing",
    "image": "/photos/customer-work.jpg",
    "logo": null
  },
  {
    "id": "figma",
    "name": "Figma",
    "category": "create",
    "title": "Make the idea tangible.",
    "description": "Collaborative interface design, prototyping and visual teamwork.",
    "help": "Plan a website or app and create a prototype before development.",
    "url": "https://www.figma.com/",
    "goal": "creative",
    "service": "digital-marketing",
    "image": "/photos/customer-work.jpg",
    "logo": "/brands/tools/figma.png"
  },
  {
    "id": "buffer",
    "name": "Buffer",
    "category": "create",
    "title": "Give your social content a rhythm.",
    "description": "Social publishing and scheduling tools for managing a content calendar.",
    "help": "Connect the right channels and build a realistic publishing schedule.",
    "url": "https://buffer.com/",
    "goal": "creative",
    "service": "digital-marketing",
    "image": "/photos/customer-work.jpg",
    "logo": "/brands/tools/buffer.png"
  },
  {
    "id": "brevo",
    "name": "Brevo",
    "category": "create",
    "title": "Keep useful conversations going.",
    "description": "Email marketing, customer communication and automation tools.",
    "help": "Organise consented contacts and plan a clear email campaign.",
    "url": "https://www.brevo.com/",
    "goal": "creative",
    "service": "digital-marketing",
    "image": "/photos/customer-work.jpg",
    "logo": "/brands/tools/brevo.svg"
  },
  {
    "id": "wordpress",
    "name": "WordPress",
    "category": "web",
    "title": "Build a home you can grow.",
    "description": "Open-source website publishing software with themes and plugins.",
    "help": "Plan hosting, build useful pages and agree an update and backup routine.",
    "url": "https://wordpress.org/",
    "goal": "online-presence",
    "service": "software",
    "image": "/photos/software-work.jpg",
    "logo": "/brands/tools/wordpress.png"
  },
  {
    "id": "shopify",
    "name": "Shopify",
    "category": "web",
    "title": "Give your shop a digital home.",
    "description": "Commerce software for building and managing an online store.",
    "help": "Plan your catalogue and explore available payments and fulfilment options.",
    "url": "https://www.shopify.com/",
    "goal": "online-presence",
    "service": "software",
    "image": "/photos/software-work.jpg",
    "logo": "/brands/tools/shopify.png"
  },
  {
    "id": "cloudflare",
    "name": "Cloudflare",
    "category": "web",
    "title": "Strengthen your website’s foundations.",
    "description": "Web infrastructure tools for DNS, performance and security.",
    "help": "Review DNS and configure appropriate protection for your site.",
    "url": "https://www.cloudflare.com/",
    "goal": "privacy",
    "service": "security",
    "image": "/photos/software-work.jpg",
    "logo": "/brands/tools/cloudflare.ico"
  },
  {
    "id": "bitwarden",
    "name": "Bitwarden",
    "category": "web",
    "title": "Give every login a better home.",
    "description": "A password manager for storing and sharing credentials securely.",
    "help": "Set up a vault, agree access rules and practise safer account habits.",
    "url": "https://bitwarden.com/",
    "goal": "privacy",
    "service": "security",
    "image": "/photos/software-work.jpg",
    "logo": "/brands/tools/bitwarden.png"
  },
  {
    "id": "1password",
    "name": "1Password",
    "category": "web",
    "title": "Make secure access easier.",
    "description": "Password and access-management tools for individuals and teams.",
    "help": "Plan team vaults, account recovery and a thoughtful onboarding routine.",
    "url": "https://1password.com/",
    "goal": "privacy",
    "service": "security",
    "image": "/photos/software-work.jpg",
    "logo": "/brands/tools/1password.svg"
  }
] as const;

export function productContext(id:string|undefined){const product=technologyProducts.find(p=>p.id===id);return product?`Tool I want help with: ${product.name}`:''}


