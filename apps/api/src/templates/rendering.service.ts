import { BadRequestException, Injectable } from "@nestjs/common";
import { AuthoringMode, TemplateVersion } from "@prisma/client";

@Injectable()
export class RenderingService {
  renderHtml(template: string, variables: Record<string, any>) {
    if (typeof template !== "string") return "";

    // Prefer Handlebars if installed.
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const Handlebars = require("handlebars") as any;
      return Handlebars.compile(template, { noEscape: true })(variables ?? {});
    } catch {
      // Minimal fallback: {{var}} replacement (no logic/loops).
      return template.replace(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g, (_, key) => {
        const value = key
          .split(".")
          .reduce((acc: any, part: string) => (acc ? acc[part] : undefined), variables);
        return value == null ? "" : String(value);
      });
    }
  }

  compileMjml(mjml: string): string {
    if (typeof mjml !== "string" || mjml.trim().length === 0) {
      throw new BadRequestException("MJML body is required to compile.");
    }
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const mjml2html = require("mjml") as any;
      const out = mjml2html(mjml, { validationLevel: "soft" });
      if (out?.errors?.length) {
        // Keep it usable while still surfacing errors.
        // eslint-disable-next-line no-console
        console.warn("[mjml] compile errors:", out.errors);
      }
      return out.html as string;
    } catch (e: any) {
      throw new BadRequestException(
        `MJML compilation failed. Ensure 'mjml' is installed in apps/api. ${e?.message ?? ""}`.trim()
      );
    }
  }

  compileFromVersion(version: TemplateVersion): { subject: string; html: string } {
    const subject = version.subject ?? "";

    switch (version.mode) {
      case AuthoringMode.RAW_HTML: {
        if (!version.bodyHtml) {
          throw new BadRequestException("RAW_HTML versions must include bodyHtml.");
        }
        return { subject, html: version.bodyHtml };
      }
      case AuthoringMode.RAW_MJML: {
        if (!version.bodyMjml) {
          throw new BadRequestException("RAW_MJML versions must include bodyMjml.");
        }
        return { subject, html: this.compileMjml(version.bodyMjml) };
      }
      case AuthoringMode.UI_BUILDER: {
        // Minimal first pass: store a JSON schema and render to HTML.
        const schema: any = version.builderSchema ?? {};
        const blocks: any[] = Array.isArray(schema?.blocks) ? schema.blocks : [];
        const html = blocks
          .map((b) => {
            if (b?.type === "text") return `<p>${String(b.text ?? "")}</p>`;
            if (b?.type === "button")
              return `<p><a href="${String(b.href ?? "#")}" style="display:inline-block;padding:10px 14px;border-radius:8px;background:#4f46e5;color:#fff;text-decoration:none">${String(
                b.label ?? "Button"
              )}</a></p>`;
            if (b?.type === "divider") return `<hr />`;
            return "";
          })
          .join("\n");
        return { subject, html: html || "<div></div>" };
      }
      default:
        throw new BadRequestException(`Unsupported authoring mode: ${version.mode as any}`);
    }
  }
}

