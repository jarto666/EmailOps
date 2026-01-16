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
export declare class FakeDataConnector {
    private users;
    private queryDelay;
    private shouldFail;
    private failureMessage;
    /**
     * Seed the fake database with users
     */
    seed(count: number, customizer?: (index: number) => Partial<FakeUser>): FakeUser[];
    /**
     * Add specific users for testing
     */
    addUsers(users: FakeUser[]): void;
    /**
     * Set query delay (ms)
     */
    setQueryDelay(ms: number): void;
    /**
     * Configure connection failure
     */
    setFailure(fail: boolean, message?: string): void;
    /**
     * Execute a "SQL" query against the fake data
     * Supports basic SELECT queries with WHERE clauses
     */
    query(sql: string): Promise<FakeUser[]>;
    /**
     * Filter users by simple WHERE conditions
     * Supports: =, !=, IN, LIKE, AND
     */
    private filterByConditions;
    /**
     * Get all users (for assertions)
     */
    getAllUsers(): FakeUser[];
    /**
     * Get user by ID
     */
    getUserById(id: string): FakeUser | undefined;
    /**
     * Get user by email
     */
    getUserByEmail(email: string): FakeUser | undefined;
    /**
     * Clear all users
     */
    clear(): void;
    /**
     * Reset to default state
     */
    reset(): void;
    /**
     * Get user count
     */
    count(): number;
}
export declare const fakeDataConnector: FakeDataConnector;
