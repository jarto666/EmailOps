export class Logger {
  private context: string;

  constructor(context: string) {
    this.context = context;
  }

  log(message: string, ...args: any[]) {
    console.log(`[${new Date().toISOString()}] [INFO] [${this.context}] ${message}`, ...args);
  }

  error(message: string, trace?: string, ...args: any[]) {
    console.error(`[${new Date().toISOString()}] [ERROR] [${this.context}] ${message}`, trace ? `\nStack: ${trace}` : '', ...args);
  }

  warn(message: string, ...args: any[]) {
    console.warn(`[${new Date().toISOString()}] [WARN] [${this.context}] ${message}`, ...args);
  }

  debug(message: string, ...args: any[]) {
    console.debug(`[${new Date().toISOString()}] [DEBUG] [${this.context}] ${message}`, ...args);
  }
}
