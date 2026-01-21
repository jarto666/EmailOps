import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { RenderingService } from './rendering.service';
import { AuthoringMode } from '@prisma/client';

describe('RenderingService', () => {
  let service: RenderingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RenderingService],
    }).compile();

    service = module.get<RenderingService>(RenderingService);
  });

  describe('renderHtml', () => {
    it('should render simple variables', () => {
      const template = 'Hello, {{name}}!';
      const variables = { name: 'World' };

      const result = service.renderHtml(template, variables);

      expect(result).toBe('Hello, World!');
    });

    it('should render nested variables', () => {
      const template = 'Hello, {{user.firstName}} {{user.lastName}}!';
      const variables = { user: { firstName: 'John', lastName: 'Doe' } };

      const result = service.renderHtml(template, variables);

      expect(result).toBe('Hello, John Doe!');
    });

    it('should handle missing variables gracefully', () => {
      const template = 'Hello, {{name}}! Your email is {{email}}.';
      const variables = { name: 'World' };

      const result = service.renderHtml(template, variables);

      expect(result).toBe('Hello, World! Your email is .');
    });

    it('should return empty string for non-string template', () => {
      const result = service.renderHtml(null as any, {});

      expect(result).toBe('');
    });

    it('should handle complex template syntax', () => {
      const template = '{{#if user}}Welcome back, {{user.name}}!{{/if}}';
      const variables = { user: { name: 'Alice' } };

      // With Handlebars installed, this should work
      const result = service.renderHtml(template, variables);

      expect(result).toContain('Alice');
    });

    it('should not escape HTML in variables', () => {
      const template = 'Content: {{content}}';
      const variables = { content: '<b>Bold</b>' };

      const result = service.renderHtml(template, variables);

      expect(result).toBe('Content: <b>Bold</b>');
    });
  });

  describe('compileMjml', () => {
    it('should compile valid MJML to HTML', () => {
      const mjml = `
        <mjml>
          <mj-body>
            <mj-section>
              <mj-column>
                <mj-text>Hello World</mj-text>
              </mj-column>
            </mj-section>
          </mj-body>
        </mjml>
      `;

      const result = service.compileMjml(mjml);

      expect(result).toContain('<!doctype html>');
      expect(result).toContain('Hello World');
    });

    it('should throw for empty MJML', () => {
      expect(() => service.compileMjml('')).toThrow(BadRequestException);
      expect(() => service.compileMjml('   ')).toThrow(BadRequestException);
    });

    it('should handle MJML with errors gracefully', () => {
      const invalidMjml = `
        <mjml>
          <mj-body>
            <mj-invalid-tag>Content</mj-invalid-tag>
          </mj-body>
        </mjml>
      `;

      // Should still return HTML (soft validation)
      const result = service.compileMjml(invalidMjml);
      expect(result).toContain('<!doctype html>');
    });
  });

  describe('compileFromVersion', () => {
    it('should compile RAW_HTML version', () => {
      const version = {
        subject: 'Test Subject',
        bodyHtml: '<html><body>Hello</body></html>',
        mode: AuthoringMode.RAW_HTML,
      };

      const result = service.compileFromVersion(version as any);

      expect(result.subject).toBe('Test Subject');
      expect(result.html).toBe('<html><body>Hello</body></html>');
    });

    it('should throw for RAW_HTML without bodyHtml', () => {
      const version = {
        subject: 'Test Subject',
        bodyHtml: null,
        mode: AuthoringMode.RAW_HTML,
      };

      expect(() => service.compileFromVersion(version as any)).toThrow(BadRequestException);
    });

    it('should compile RAW_MJML version', () => {
      const version = {
        subject: 'Test Subject',
        bodyMjml: `
          <mjml>
            <mj-body>
              <mj-section>
                <mj-column>
                  <mj-text>Hello</mj-text>
                </mj-column>
              </mj-section>
            </mj-body>
          </mjml>
        `,
        mode: AuthoringMode.RAW_MJML,
      };

      const result = service.compileFromVersion(version as any);

      expect(result.subject).toBe('Test Subject');
      expect(result.html).toContain('<!doctype html>');
      expect(result.html).toContain('Hello');
    });

    it('should throw for RAW_MJML without bodyMjml', () => {
      const version = {
        subject: 'Test Subject',
        bodyMjml: null,
        mode: AuthoringMode.RAW_MJML,
      };

      expect(() => service.compileFromVersion(version as any)).toThrow(BadRequestException);
    });

    it('should compile UI_BUILDER version with text block', () => {
      const version = {
        subject: 'Test Subject',
        builderSchema: {
          blocks: [
            { type: 'text', text: 'Hello World' },
          ],
        },
        mode: AuthoringMode.UI_BUILDER,
      };

      const result = service.compileFromVersion(version as any);

      expect(result.subject).toBe('Test Subject');
      expect(result.html).toContain('<p>Hello World</p>');
    });

    it('should compile UI_BUILDER version with button block', () => {
      const version = {
        subject: 'Test Subject',
        builderSchema: {
          blocks: [
            { type: 'button', label: 'Click Me', href: 'https://example.com' },
          ],
        },
        mode: AuthoringMode.UI_BUILDER,
      };

      const result = service.compileFromVersion(version as any);

      expect(result.subject).toBe('Test Subject');
      expect(result.html).toContain('Click Me');
      expect(result.html).toContain('https://example.com');
    });

    it('should compile UI_BUILDER version with divider block', () => {
      const version = {
        subject: 'Test Subject',
        builderSchema: {
          blocks: [
            { type: 'divider' },
          ],
        },
        mode: AuthoringMode.UI_BUILDER,
      };

      const result = service.compileFromVersion(version as any);

      expect(result.subject).toBe('Test Subject');
      expect(result.html).toContain('<hr />');
    });

    it('should compile UI_BUILDER version with multiple blocks', () => {
      const version = {
        subject: 'Test Subject',
        builderSchema: {
          blocks: [
            { type: 'text', text: 'Welcome!' },
            { type: 'divider' },
            { type: 'button', label: 'Learn More', href: 'https://example.com' },
          ],
        },
        mode: AuthoringMode.UI_BUILDER,
      };

      const result = service.compileFromVersion(version as any);

      expect(result.html).toContain('Welcome!');
      expect(result.html).toContain('<hr />');
      expect(result.html).toContain('Learn More');
    });

    it('should handle UI_BUILDER version with empty blocks', () => {
      const version = {
        subject: 'Test Subject',
        builderSchema: {
          blocks: [],
        },
        mode: AuthoringMode.UI_BUILDER,
      };

      const result = service.compileFromVersion(version as any);

      expect(result.subject).toBe('Test Subject');
      expect(result.html).toBe('<div></div>');
    });

    it('should throw for unsupported authoring mode', () => {
      const version = {
        subject: 'Test Subject',
        mode: 'INVALID_MODE' as any,
      };

      expect(() => service.compileFromVersion(version as any)).toThrow(BadRequestException);
    });
  });
});
