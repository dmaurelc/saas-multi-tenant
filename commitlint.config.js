// Commitlint configuration for conventional commits
// @see https://commitlint.js.org/

/** @type {import('@commitlint/types').UserConfig} */
const config = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // Type enum - allowed commit types
    'type-enum': [
      2,
      'always',
      [
        'feat',     // New feature
        'fix',      // Bug fix
        'docs',     // Documentation
        'refactor', // Code refactor
        'test',     // Tests
        'chore',    // Maintenance
        'perf',     // Performance
        'style',    // Code style
        'revert',   // Revert commit
        'ci',       // CI/CD
      ],
    ],
    // Scope enum - allowed scopes
    'scope-enum': [
      2,
      'always',
      [
        'auth',         // Authentication
        'tenants',      // Tenant management
        'users',        // User management
        'payments',     // Payments and subscriptions
        'notifications',// Notifications
        'ecommerce',    // eCommerce module
        'services',     // SaaS Services module
        'realestate',   // Real Estate module
        'restaurant',   // Restaurant module
        'api',          // Public API
        'ui',           // UI components
        'db',           // Database
        'core',         // Core functionality
        'deps',         // Dependencies
        'ci',           // CI/CD
        'docs',         // Documentation
      ],
    ],
    // Subject must be lowercase
    'subject-case': [2, 'always', 'lower-case'],
    // Subject max length
    'subject-max-length': [2, 'always', 72],
    // Body max line length
    'body-max-line-length': [2, 'always', 100],
    // Require scope for feat/fix
    'scope-empty': [1, 'never', ['feat', 'fix']],
  },
};

export default config;
