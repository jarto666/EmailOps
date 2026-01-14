"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailCompiler = void 0;
const mjml_1 = __importDefault(require("mjml"));
const handlebars_1 = __importDefault(require("handlebars"));
class EmailCompiler {
    static compileMjml(mjmlContent) {
        const { html, errors } = (0, mjml_1.default)(mjmlContent);
        return { html, errors };
    }
    static render(templateHtml, variables) {
        const template = handlebars_1.default.compile(templateHtml);
        return template(variables);
    }
    // Builder JSON -> MJML would go here
    static compileBuilderJson(schema) {
        // Stub: convert builder schema to MJML string
        return `<mjml><mj-body><mj-text>Builder content stub</mj-text></mj-body></mjml>`;
    }
}
exports.EmailCompiler = EmailCompiler;
