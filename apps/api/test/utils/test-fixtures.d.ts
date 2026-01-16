import { PrismaClient } from '@email-ops/core';
/**
 * Test fixtures factory
 * Creates test data in the database for integration tests
 */
export declare class TestFixtures {
    private prisma;
    constructor(prisma: PrismaClient);
    /**
     * Create a workspace with all necessary base data
     */
    createWorkspace(overrides?: {
        name?: string;
    }): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
    }>;
    /**
     * Create an email provider connector (SES)
     */
    createEmailConnector(workspaceId: string, overrides?: {
        name?: string;
        type?: 'SES' | 'RESEND' | 'SMTP';
    }): Promise<{
        id: string;
        type: import("@email-ops/core").$Enums.EmailProviderType;
        name: string;
        config: import("@prisma/client/runtime/client").JsonValue;
        createdAt: Date;
        updatedAt: Date;
        workspaceId: string;
    }>;
    /**
     * Create a data connector (Postgres)
     */
    createDataConnector(workspaceId: string, overrides?: {
        name?: string;
        type?: 'POSTGRES' | 'BIGQUERY';
    }): Promise<{
        id: string;
        type: import("@email-ops/core").$Enums.DataConnectorType;
        name: string;
        config: import("@prisma/client/runtime/client").JsonValue;
        createdAt: Date;
        updatedAt: Date;
        workspaceId: string;
    }>;
    /**
     * Create a sender profile
     */
    createSenderProfile(workspaceId: string, emailConnectorId: string, overrides?: {
        name?: string;
        fromEmail?: string;
        fromName?: string;
    }): Promise<{
        id: string;
        name: string | null;
        createdAt: Date;
        updatedAt: Date;
        workspaceId: string;
        emailProviderConnectorId: string;
        fromEmail: string;
        fromName: string | null;
        replyTo: string | null;
    }>;
    /**
     * Create a template with an active version
     */
    createTemplate(workspaceId: string, overrides?: {
        key?: string;
        name?: string;
        category?: 'MARKETING' | 'TRANSACTIONAL' | 'BOTH';
        subject?: string;
        bodyHtml?: string;
    }): Promise<({
        versions: {
            id: string;
            createdAt: Date;
            subject: string;
            mode: import("@email-ops/core").$Enums.AuthoringMode;
            bodyHtml: string | null;
            bodyMjml: string | null;
            builderSchema: import("@prisma/client/runtime/client").JsonValue | null;
            templateId: string;
            version: number;
            preheader: string | null;
            active: boolean;
        }[];
    } & {
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        workspaceId: string;
        key: string;
        category: import("@email-ops/core").$Enums.TemplateCategory;
    }) | null>;
    /**
     * Create a segment
     */
    createSegment(workspaceId: string, dataConnectorId: string, overrides?: {
        name?: string;
        sqlQuery?: string;
    }): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        workspaceId: string;
        description: string | null;
        sqlQuery: string;
        dataConnectorId: string;
    }>;
    /**
     * Create a campaign group
     */
    createCampaignGroup(workspaceId: string, overrides?: {
        name?: string;
        collisionWindow?: number;
        collisionPolicy?: 'HIGHEST_PRIORITY_WINS' | 'FIRST_QUEUED_WINS' | 'SEND_ALL';
    }): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        workspaceId: string;
        description: string | null;
        collisionWindow: number;
        collisionPolicy: import("@email-ops/core").$Enums.CollisionPolicy;
    }>;
    /**
     * Create a single send (campaign)
     */
    createSingleSend(workspaceId: string, templateId: string, segmentId: string, senderProfileId: string, overrides?: {
        name?: string;
        status?: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'ARCHIVED' | 'COMPLETED';
        campaignGroupId?: string;
        priority?: number;
    }): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        workspaceId: string;
        templateId: string;
        description: string | null;
        status: import("@email-ops/core").$Enums.SingleSendStatus;
        priority: number;
        scheduleType: import("@email-ops/core").$Enums.ScheduleType;
        cronExpression: string | null;
        policies: import("@prisma/client/runtime/client").JsonValue | null;
        segmentId: string;
        senderProfileId: string;
        campaignGroupId: string | null;
    }>;
    /**
     * Create a complete test setup with all related entities
     */
    createCompleteSetup(): Promise<{
        workspace: {
            id: string;
            name: string;
            createdAt: Date;
            updatedAt: Date;
        };
        emailConnector: {
            id: string;
            type: import("@email-ops/core").$Enums.EmailProviderType;
            name: string;
            config: import("@prisma/client/runtime/client").JsonValue;
            createdAt: Date;
            updatedAt: Date;
            workspaceId: string;
        };
        dataConnector: {
            id: string;
            type: import("@email-ops/core").$Enums.DataConnectorType;
            name: string;
            config: import("@prisma/client/runtime/client").JsonValue;
            createdAt: Date;
            updatedAt: Date;
            workspaceId: string;
        };
        senderProfile: {
            id: string;
            name: string | null;
            createdAt: Date;
            updatedAt: Date;
            workspaceId: string;
            emailProviderConnectorId: string;
            fromEmail: string;
            fromName: string | null;
            replyTo: string | null;
        };
        template: {
            versions: {
                id: string;
                createdAt: Date;
                subject: string;
                mode: import("@email-ops/core").$Enums.AuthoringMode;
                bodyHtml: string | null;
                bodyMjml: string | null;
                builderSchema: import("@prisma/client/runtime/client").JsonValue | null;
                templateId: string;
                version: number;
                preheader: string | null;
                active: boolean;
            }[];
        } & {
            id: string;
            name: string;
            createdAt: Date;
            updatedAt: Date;
            workspaceId: string;
            key: string;
            category: import("@email-ops/core").$Enums.TemplateCategory;
        };
        segment: {
            id: string;
            name: string;
            createdAt: Date;
            updatedAt: Date;
            workspaceId: string;
            description: string | null;
            sqlQuery: string;
            dataConnectorId: string;
        };
        campaignGroup: {
            id: string;
            name: string;
            createdAt: Date;
            updatedAt: Date;
            workspaceId: string;
            description: string | null;
            collisionWindow: number;
            collisionPolicy: import("@email-ops/core").$Enums.CollisionPolicy;
        };
    }>;
    /**
     * Create a single send with all dependencies
     */
    createSingleSendWithDeps(overrides?: {
        segmentQuery?: string;
        templateSubject?: string;
        templateBody?: string;
    }): Promise<{
        singleSend: {
            id: string;
            name: string;
            createdAt: Date;
            updatedAt: Date;
            workspaceId: string;
            templateId: string;
            description: string | null;
            status: import("@email-ops/core").$Enums.SingleSendStatus;
            priority: number;
            scheduleType: import("@email-ops/core").$Enums.ScheduleType;
            cronExpression: string | null;
            policies: import("@prisma/client/runtime/client").JsonValue | null;
            segmentId: string;
            senderProfileId: string;
            campaignGroupId: string | null;
        };
        workspace: {
            id: string;
            name: string;
            createdAt: Date;
            updatedAt: Date;
        };
        emailConnector: {
            id: string;
            type: import("@email-ops/core").$Enums.EmailProviderType;
            name: string;
            config: import("@prisma/client/runtime/client").JsonValue;
            createdAt: Date;
            updatedAt: Date;
            workspaceId: string;
        };
        dataConnector: {
            id: string;
            type: import("@email-ops/core").$Enums.DataConnectorType;
            name: string;
            config: import("@prisma/client/runtime/client").JsonValue;
            createdAt: Date;
            updatedAt: Date;
            workspaceId: string;
        };
        senderProfile: {
            id: string;
            name: string | null;
            createdAt: Date;
            updatedAt: Date;
            workspaceId: string;
            emailProviderConnectorId: string;
            fromEmail: string;
            fromName: string | null;
            replyTo: string | null;
        };
        template: {
            versions: {
                id: string;
                createdAt: Date;
                subject: string;
                mode: import("@email-ops/core").$Enums.AuthoringMode;
                bodyHtml: string | null;
                bodyMjml: string | null;
                builderSchema: import("@prisma/client/runtime/client").JsonValue | null;
                templateId: string;
                version: number;
                preheader: string | null;
                active: boolean;
            }[];
        } & {
            id: string;
            name: string;
            createdAt: Date;
            updatedAt: Date;
            workspaceId: string;
            key: string;
            category: import("@email-ops/core").$Enums.TemplateCategory;
        };
        segment: {
            id: string;
            name: string;
            createdAt: Date;
            updatedAt: Date;
            workspaceId: string;
            description: string | null;
            sqlQuery: string;
            dataConnectorId: string;
        };
        campaignGroup: {
            id: string;
            name: string;
            createdAt: Date;
            updatedAt: Date;
            workspaceId: string;
            description: string | null;
            collisionWindow: number;
            collisionPolicy: import("@email-ops/core").$Enums.CollisionPolicy;
        };
    }>;
}
