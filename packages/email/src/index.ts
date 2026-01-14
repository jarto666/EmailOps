import mjml2html from "mjml";
import Handlebars from "handlebars";

export interface CompilationResult {
  html: string;
  errors?: any[];
}

export class EmailCompiler {
  static compileMjml(mjmlContent: string): CompilationResult {
    const { html, errors } = mjml2html(mjmlContent);
    return { html, errors };
  }

  static render(templateHtml: string, variables: Record<string, any>): string {
    const template = Handlebars.compile(templateHtml);
    return template(variables);
  }

  // Builder JSON -> MJML would go here
  static compileBuilderJson(schema: any): string {
    // Stub: convert builder schema to MJML string
    return `<mjml><mj-body><mj-text>Builder content stub</mj-text></mj-body></mjml>`;
  }
}
