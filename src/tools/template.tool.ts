/**
 * Template Evaluation Tool for Home Assistant
 *
 * Renders Jinja2 templates using the Home Assistant template API.
 * Templates can query entity states, perform calculations, and format data.
 */

import { z } from "zod";
import { UserError } from "fastmcp";
import { logger } from "../utils/logger.js";
import { APP_CONFIG } from "../config/app.config.js";
import { Tool } from "../types/index.js";

const renderTemplateSchema = z.object({
  template: z
    .string()
    .min(1)
    .describe(
      'Jinja2 template string to evaluate. Examples: \'{{ states("sensor.temperature") }}\', \'{{ states.light | selectattr("state", "eq", "on") | list | count }} lights are on\', \'{{ now() }}\'',
    ),
});

type RenderTemplateParams = z.infer<typeof renderTemplateSchema>;

async function executeRenderTemplate(params: RenderTemplateParams): Promise<string> {
  try {
    const response = await fetch(`${APP_CONFIG.HASS_HOST}/api/template`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${APP_CONFIG.HASS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ template: params.template }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new UserError(
        `Template rendering failed (${response.status}): ${errorText}`,
      );
    }

    const result = await response.text();
    return JSON.stringify({ result });
  } catch (error) {
    if (error instanceof UserError) throw error;
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`Failed to render template: ${message}`);
    throw new UserError(`Failed to render template: ${message}`);
  }
}

export const renderTemplateTool: Tool = {
  name: "render_template",
  description:
    "Evaluate a Home Assistant Jinja2 template. Use this to query complex state information, perform calculations, format data, or test template expressions. The template is rendered server-side by Home Assistant and the result is returned as text.",
  parameters: renderTemplateSchema,
  execute: executeRenderTemplate,
  annotations: {
    title: "Render Template",
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
};
