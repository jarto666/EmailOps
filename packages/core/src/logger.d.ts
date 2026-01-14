export declare class Logger {
    private context;
    constructor(context: string);
    log(message: string, ...args: any[]): void;
    error(message: string, trace?: string, ...args: any[]): void;
    warn(message: string, ...args: any[]): void;
    debug(message: string, ...args: any[]): void;
}
