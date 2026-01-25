import { generateKeyBetween } from "fractional-indexing";
import type { Task } from "./get-tasks";

/**
 * Assignees for mock tasks
 */
const assignees = [
  "Alice Johnson",
  "Bob Smith",
  "Carol Williams",
  "David Brown",
  "Eve Davis",
  "Frank Miller",
  "Grace Wilson",
  "Henry Moore",
];

/**
 * Labels for mock tasks
 */
const labels = [
  "auth",
  "security",
  "frontend",
  "backend",
  "devops",
  "testing",
  "docs",
  "api",
  "database",
  "ui/ux",
];

/**
 * Generates N fractional indices in order
 */
function generateOrders(count: number): string[] {
  const orders: string[] = [];
  let prev: string | null = null;
  for (let i = 0; i < count; i++) {
    const next = generateKeyBetween(prev, null);
    orders.push(next);
    prev = next;
  }
  return orders;
}

/**
 * Random helper functions
 */
function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomLabels(): string[] {
  const count = Math.floor(Math.random() * 3) + 1; // 1-3 labels
  const shuffled = [...labels].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function daysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
}

/**
 * Task titles organized by category for realistic software project tasks
 */
const taskTitles: Record<Task["status"], string[]> = {
  todo: [
    "Implement OAuth 2.0 authentication flow",
    "Design database schema for user preferences",
    "Create API documentation for v2 endpoints",
    "Set up automated backup system",
    "Implement rate limiting middleware",
    "Add multi-language support (i18n)",
    "Design onboarding wizard flow",
    "Implement search indexing with Elasticsearch",
    "Add WebSocket support for real-time updates",
    "Create admin dashboard analytics page",
    "Set up CI/CD pipeline for staging environment",
    "Implement file upload with progress tracking",
    "Add two-factor authentication option",
    "Design notification system architecture",
    "Create user roles and permissions system",
  ],
  doing: [
    "Refactor authentication module to use JWT",
    "Implement lazy loading for images",
    "Fix memory leak in WebSocket handler",
    "Add unit tests for payment service",
    "Optimize database queries for dashboard",
    "Implement caching layer with Redis",
    "Create responsive mobile navigation",
    "Add error boundary components",
    "Implement form validation library",
    "Set up monitoring with Prometheus",
    "Refactor API error handling",
    "Add dark mode theme support",
  ],
  done: [
    "Set up project repository and initial structure",
    "Configure ESLint and Prettier",
    "Implement basic user registration",
    "Create login page with validation",
    "Set up database migrations",
    "Add password reset functionality",
    "Implement session management",
    "Create user profile page",
    "Add email verification flow",
    "Set up error logging with Sentry",
    "Implement CORS configuration",
    "Create API health check endpoint",
    "Add request/response logging",
    "Set up development environment docs",
    "Implement basic CRUD for users",
    "Add pagination to list endpoints",
    "Create Docker development setup",
    "Implement basic role-based access",
  ],
  archived: [
    "Legacy payment gateway integration",
    "Old dashboard design mockups",
    "Deprecated API v1 documentation",
    "Previous mobile app prototype",
    "Old authentication flow specs",
  ],
  cancelled: [
    "Blockchain integration for payments",
    "Native desktop application",
    "Voice command feature",
    "AR product visualization",
    "Cryptocurrency wallet integration",
  ],
};

const taskDescriptions: Record<Task["status"], string[]> = {
  todo: [
    "Implement secure OAuth 2.0 flow with support for Google, GitHub, and Microsoft providers",
    "Design scalable schema for storing user preferences with proper indexing",
    "Write comprehensive API documentation covering all v2 endpoints with examples",
    "Configure automated daily backups with retention policy and recovery testing",
    "Add rate limiting to prevent API abuse with configurable thresholds per endpoint",
    "Set up internationalization framework with support for 5 initial languages",
    "Create step-by-step onboarding experience for new users with progress tracking",
    "Integrate Elasticsearch for full-text search across all content types",
    "Add real-time updates using WebSocket for collaborative features",
    "Build analytics dashboard showing key metrics and usage patterns",
    "Configure CI/CD pipeline with automated testing and deployment to staging",
    "Implement chunked file upload with resume capability and progress indicators",
    "Add TOTP-based 2FA with backup codes and recovery options",
    "Design pub/sub notification system with multiple delivery channels",
    "Implement flexible RBAC system with custom role definitions",
  ],
  doing: [
    "Migrate from session-based auth to JWT with refresh token rotation",
    "Implement intersection observer for lazy loading images below the fold",
    "Investigate and fix memory leak causing gradual heap growth in WS handler",
    "Write comprehensive unit and integration tests for payment processing",
    "Profile and optimize slow queries on the main dashboard aggregations",
    "Set up Redis caching layer with intelligent cache invalidation",
    "Build responsive navigation that works well on all screen sizes",
    "Add React error boundaries with proper fallback UI and error reporting",
    "Create reusable form validation with custom validators and async rules",
    "Deploy Prometheus stack with Grafana dashboards for system monitoring",
    "Standardize API error responses with proper error codes and messages",
    "Implement dark mode with system preference detection and toggle",
  ],
  done: [
    "Initial repository setup with monorepo structure and workspace configuration",
    "Configure linting rules and code formatting with pre-commit hooks",
    "Basic registration flow with email and password validation",
    "Login page with form validation and remember me functionality",
    "Set up database migration system with rollback support",
    "Email-based password reset with secure token generation",
    "Session management with automatic expiration and renewal",
    "User profile page with avatar upload and info editing",
    "Email verification with resend capability and expiration handling",
    "Sentry integration for error tracking with proper source maps",
    "CORS configuration with environment-specific allowed origins",
    "Health check endpoint reporting database and cache connectivity",
    "Request logging middleware with correlation IDs for tracing",
    "Developer setup guide with environment configuration steps",
    "CRUD operations for user management with validation",
    "Offset and cursor-based pagination for all list endpoints",
    "Docker Compose setup for local development with hot reload",
    "Basic role system with admin, user, and guest permissions",
  ],
  archived: [
    "Previous Stripe integration replaced with new payment provider",
    "Dashboard mockups superseded by new design system",
    "API v1 docs kept for reference during migration period",
    "React Native prototype before switching to PWA approach",
    "Original auth flow before security audit recommendations",
  ],
  cancelled: [
    "Blockchain payment feature deprioritized due to market conditions",
    "Desktop app cancelled in favor of responsive web approach",
    "Voice commands feature moved to future roadmap",
    "AR feature not feasible with current technology stack",
    "Crypto wallet feature cancelled due to regulatory concerns",
  ],
};

/**
 * Priority distribution per status
 */
const priorityDistribution: Record<
  Task["status"],
  { priority: Task["priority"]; count: number }[]
> = {
  todo: [
    { priority: "high", count: 4 },
    { priority: "medium", count: 6 },
    { priority: "low", count: 5 },
  ],
  doing: [
    { priority: "high", count: 5 },
    { priority: "medium", count: 5 },
    { priority: "low", count: 2 },
  ],
  done: [
    { priority: "high", count: 3 },
    { priority: "medium", count: 8 },
    { priority: "low", count: 7 },
  ],
  archived: [
    { priority: "high", count: 1 },
    { priority: "medium", count: 2 },
    { priority: "low", count: 2 },
  ],
  cancelled: [
    { priority: "high", count: 2 },
    { priority: "medium", count: 2 },
    { priority: "low", count: 1 },
  ],
};

/**
 * Generates mock tasks for the Kanban board
 */
export function generateMockTasks(): Task[] {
  const tasks: Task[] = [];
  let taskIdCounter = 1;

  const statuses: Task["status"][] = [
    "todo",
    "doing",
    "done",
    "archived",
    "cancelled",
  ];

  for (const status of statuses) {
    const titles = taskTitles[status];
    const descriptions = taskDescriptions[status];
    const distribution = priorityDistribution[status];

    // Calculate total tasks for this status
    const totalTasks = distribution.reduce((sum, d) => sum + d.count, 0);
    const orders = generateOrders(totalTasks);

    let titleIndex = 0;
    let orderIndex = 0;

    for (const { priority, count } of distribution) {
      for (let i = 0; i < count; i++) {
        const createdDaysAgo = Math.floor(Math.random() * 60) + 1; // 1-60 days ago
        const updatedDaysAgo = Math.floor(Math.random() * createdDaysAgo);
        const stageDaysAgo = Math.floor(Math.random() * updatedDaysAgo);

        tasks.push({
          id: `task-${String(taskIdCounter++).padStart(3, "0")}`,
          title: titles[titleIndex % titles.length],
          description: descriptions[titleIndex % descriptions.length],
          status,
          priority,
          assignee: randomFrom(assignees),
          labels: randomLabels(),
          order: orders[orderIndex++],
          createdAt: daysAgo(createdDaysAgo),
          updatedAt: daysAgo(updatedDaysAgo),
          updatedStageAt: daysAgo(stageDaysAgo),
        });

        titleIndex++;
      }
    }
  }

  return tasks;
}
