/**
 * Fake Data Connector for testing segment queries
 * Simulates querying an external customer database
 */

export interface FakeUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  created_at: Date;
  plan?: string;
  tags?: string[];
  [key: string]: any;
}

function randomString(length = 8): string {
  return Math.random().toString(36).substring(2, 2 + length);
}

function randomUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

const firstNames = ['John', 'Jane', 'Bob', 'Alice', 'Charlie', 'Diana', 'Eve', 'Frank'];
const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis'];
const plans = ['free', 'starter', 'pro', 'enterprise'];
const tagOptions = ['active', 'engaged', 'churned', 'trial'];

export class FakeDataConnector {
  private users: FakeUser[] = [];
  private queryDelay = 0;
  private shouldFail = false;
  private failureMessage = 'Connection failed';

  /**
   * Seed the fake database with users
   */
  seed(count: number, customizer?: (index: number) => Partial<FakeUser>): FakeUser[] {
    const newUsers: FakeUser[] = [];

    for (let i = 0; i < count; i++) {
      const baseUser: FakeUser = {
        id: randomUUID(),
        email: `user-${randomString()}@example.com`.toLowerCase(),
        first_name: firstNames[Math.floor(Math.random() * firstNames.length)],
        last_name: lastNames[Math.floor(Math.random() * lastNames.length)],
        created_at: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000),
        plan: plans[Math.floor(Math.random() * plans.length)],
        tags: tagOptions.slice(0, Math.floor(Math.random() * 3)),
      };

      const customFields = customizer ? customizer(i) : {};
      const user = { ...baseUser, ...customFields };
      newUsers.push(user);
    }

    this.users.push(...newUsers);
    return newUsers;
  }

  /**
   * Add specific users for testing
   */
  addUsers(users: FakeUser[]): void {
    this.users.push(...users);
  }

  /**
   * Set query delay (ms)
   */
  setQueryDelay(ms: number): void {
    this.queryDelay = ms;
  }

  /**
   * Configure connection failure
   */
  setFailure(fail: boolean, message = 'Connection failed'): void {
    this.shouldFail = fail;
    this.failureMessage = message;
  }

  /**
   * Execute a "SQL" query against the fake data
   * Supports basic SELECT queries with WHERE clauses
   */
  async query(sql: string): Promise<FakeUser[]> {
    // Simulate network delay
    if (this.queryDelay > 0) {
      await new Promise((resolve) => setTimeout(resolve, this.queryDelay));
    }

    // Simulate connection failure
    if (this.shouldFail) {
      throw new Error(this.failureMessage);
    }

    // Parse and execute simple queries
    // This is a very basic SQL parser for testing purposes
    const normalizedSql = sql.toLowerCase().trim();

    // If it's a simple SELECT * FROM users, return all
    if (normalizedSql.match(/select\s+.*\s+from\s+users\s*$/)) {
      return [...this.users];
    }

    // Handle WHERE clause with simple conditions
    const whereMatch = normalizedSql.match(/where\s+(.+)$/);
    if (whereMatch) {
      const conditions = whereMatch[1];
      return this.filterByConditions(conditions);
    }

    // If we can't parse it, return all users
    return [...this.users];
  }

  /**
   * Filter users by simple WHERE conditions
   * Supports: =, !=, IN, LIKE, AND
   */
  private filterByConditions(conditions: string): FakeUser[] {
    return this.users.filter((user) => {
      // Handle plan = 'value'
      const planMatch = conditions.match(/plan\s*=\s*'([^']+)'/);
      if (planMatch && user.plan !== planMatch[1]) {
        return false;
      }

      // Handle plan != 'value'
      const planNotMatch = conditions.match(/plan\s*!=\s*'([^']+)'/);
      if (planNotMatch && user.plan === planNotMatch[1]) {
        return false;
      }

      // Handle plan IN ('a', 'b')
      const planInMatch = conditions.match(/plan\s+in\s*\(([^)]+)\)/);
      if (planInMatch) {
        const values = planInMatch[1].split(',').map((v) => v.trim().replace(/'/g, ''));
        if (!values.includes(user.plan || '')) {
          return false;
        }
      }

      // Handle email LIKE pattern
      const likeMatch = conditions.match(/email\s+like\s+'([^']+)'/);
      if (likeMatch) {
        const pattern = likeMatch[1].replace(/%/g, '.*');
        const regex = new RegExp(pattern, 'i');
        if (!regex.test(user.email)) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Get all users (for assertions)
   */
  getAllUsers(): FakeUser[] {
    return [...this.users];
  }

  /**
   * Get user by ID
   */
  getUserById(id: string): FakeUser | undefined {
    return this.users.find((u) => u.id === id);
  }

  /**
   * Get user by email
   */
  getUserByEmail(email: string): FakeUser | undefined {
    return this.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  }

  /**
   * Clear all users
   */
  clear(): void {
    this.users = [];
  }

  /**
   * Reset to default state
   */
  reset(): void {
    this.clear();
    this.queryDelay = 0;
    this.shouldFail = false;
    this.failureMessage = 'Connection failed';
  }

  /**
   * Get user count
   */
  count(): number {
    return this.users.length;
  }
}

// Singleton for easy access
export const fakeDataConnector = new FakeDataConnector();
