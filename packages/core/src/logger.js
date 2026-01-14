"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Logger = void 0;
class Logger {
    constructor(context) {
        this.context = context;
    }
    log(message, ...args) {
        console.log(`[${new Date().toISOString()}] [INFO] [${this.context}] ${message}`, ...args);
    }
    error(message, trace, ...args) {
        console.error(`[${new Date().toISOString()}] [ERROR] [${this.context}] ${message}`, trace ? `\nStack: ${trace}` : '', ...args);
    }
    warn(message, ...args) {
        console.warn(`[${new Date().toISOString()}] [WARN] [${this.context}] ${message}`, ...args);
    }
    debug(message, ...args) {
        console.debug(`[${new Date().toISOString()}] [DEBUG] [${this.context}] ${message}`, ...args);
    }
}
exports.Logger = Logger;
