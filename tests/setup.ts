// Set up environment variables for tests
process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/traveldeals_test";
process.env.REDIS_URL = "redis://localhost:6379";
process.env.GROQ_API_KEY = "gsk_test_key";
process.env.NEXTAUTH_SECRET = "test-secret-for-testing-only";
process.env.NEXTAUTH_URL = "http://localhost:3000";
// NODE_ENV is set by vitest config (environment: "node") automatically

// Optional vars
process.env.AMADEUS_CLIENT_ID = "test-amadeus-id";
process.env.AMADEUS_CLIENT_SECRET = "test-amadeus-secret";
process.env.KIWI_API_KEY = "test-kiwi-key";
process.env.SERPAPI_API_KEY = "test-serpapi-key";
process.env.RESEND_API_KEY = "re_test_key";
