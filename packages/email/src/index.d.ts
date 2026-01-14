export interface CompilationResult {
    html: string;
    errors?: any[];
}
export declare class EmailCompiler {
    static compileMjml(mjmlContent: string): CompilationResult;
    static render(templateHtml: string, variables: Record<string, any>): string;
    static compileBuilderJson(schema: any): string;
}
