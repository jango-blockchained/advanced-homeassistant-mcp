import express from "express";
import { z } from "zod";
import { NLPProcessor } from "../nlp/processor.js";
import { AIRateLimit, AIContext, AIResponse, AIError, AIModel } from "../types/index.js";
import rateLimit from "express-rate-limit";

const router = express.Router();

// Lazily resolve the processor so that tests can `mock.module(...)` the module
// before the first request comes in. A module-load `new NLPProcessor()` would
// be constructed against the real implementation before any mock can apply.
let _processor: NLPProcessor | null = null;
function getProcessor(): NLPProcessor {
  if (!_processor) {
    _processor = new NLPProcessor();
  }
  return _processor;
}

// Rate limiting configuration
const rateLimitConfig: AIRateLimit = {
  requests_per_minute: 100,
  requests_per_hour: 1000,
  concurrent_requests: 10,
  model_specific_limits: {
    claude: {
      requests_per_minute: 100,
      requests_per_hour: 1000,
    },
    gpt4: {
      requests_per_minute: 50,
      requests_per_hour: 500,
    },
    custom: {
      requests_per_minute: 200,
      requests_per_hour: 2000,
    },
  },
};

// Request validation schemas
const interpretRequestSchema = z.object({
  input: z.string(),
  context: z.object({
    user_id: z.string(),
    session_id: z.string(),
    timestamp: z.string(),
    location: z.string(),
    previous_actions: z.array(z.any()),
    environment_state: z.record(z.any()),
  }),
  model: z.enum(["claude", "gpt4", "custom"]).optional(),
});

// Rate limiters
const globalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: rateLimitConfig.requests_per_minute,
});

const modelSpecificLimiter = (model: string) =>
  rateLimit({
    windowMs: 60 * 1000,
    max:
      rateLimitConfig.model_specific_limits[model as AIModel]?.requests_per_minute ||
      rateLimitConfig.requests_per_minute,
  });

// Error handler middleware
const errorHandler = (
  error: Error,
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
) => {
  const aiError: AIError = {
    code: "PROCESSING_ERROR",
    message: error.message,
    suggestion: "Please try again with a different command format",
    recovery_options: [
      "Simplify your command",
      "Use standard command patterns",
      "Check device names and parameters",
    ],
    // req.body may be undefined for GET requests with no body or when an
    // upstream parser hasn't run; treat as optional.
    context: (req.body as { context?: AIContext } | undefined)?.context,
  };

  res.status(500).json({ error: aiError });
};

// Endpoints
router.post(
  "/interpret",
  globalLimiter,
  (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const { input, context, model = "claude" } = interpretRequestSchema.parse(req.body);

      // Apply model-specific rate limiting
      modelSpecificLimiter(model)(req, res, async () => {
        const { intent, confidence, error } = await getProcessor().processCommand(input, context);

        if (error) {
          return res.status(400).json({ error });
        }

        const isValid = await getProcessor().validateIntent(intent, confidence);

        if (!isValid) {
          const suggestions = await getProcessor().suggestCorrections(input, {
            code: "INVALID_INTENT",
            message: "Could not understand the command with high confidence",
            suggestion: "Please try rephrasing your command",
            recovery_options: [],
            context,
          });

          return res.status(400).json({
            error: {
              code: "INVALID_INTENT",
              message: "Could not understand the command with high confidence",
              suggestion: "Please try rephrasing your command",
              recovery_options: suggestions,
              context,
            },
          });
        }

        const response: AIResponse = {
          natural_language: `I'll ${intent.action} the ${intent.target.split(".").pop()}`,
          structured_data: {
            success: true,
            action_taken: intent.action,
            entities_affected: [intent.target],
            state_changes: intent.parameters,
          },
          next_suggestions: [
            "Would you like to adjust any settings?",
            "Should I perform this action in other rooms?",
            "Would you like to schedule this action?",
          ],
          confidence,
          context,
        };

        res.json(response);
      });
    } catch (error) {
      next(error);
    }
  },
);

interface ExecuteRequestBody {
  intent: { action: string; target: string; parameters?: Record<string, unknown> };
  context: AIContext;
  model?: string;
}

router.post(
  "/execute",
  globalLimiter,
  (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const { intent, context, model = "claude" } = req.body as ExecuteRequestBody;

      // Apply model-specific rate limiting
      modelSpecificLimiter(model)(req, res, () => {
        // Execute the intent through Home Assistant
        // This would integrate with your existing Home Assistant service

        const response: AIResponse = {
          natural_language: `Successfully executed ${intent.action} on ${intent.target}`,
          structured_data: {
            success: true,
            action_taken: intent.action,
            entities_affected: [intent.target],
            state_changes: intent.parameters ?? {},
          },
          next_suggestions: [
            "Would you like to verify the state?",
            "Should I perform any related actions?",
            "Would you like to undo this action?",
          ],
          confidence: { overall: 1, intent: 1, entities: 1, context: 1 },
          context,
        };

        res.json(response);
      });
    } catch (error) {
      next(error);
    }
  },
);

router.get(
  "/suggestions",
  globalLimiter,
  (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      // GET requests don't typically carry a body. Tolerate either an empty
      // body or one supplied by `supertest.send(...)` for legacy callers.
      const body = (req.body ?? {}) as { context?: AIContext; model?: string };
      const { model = "claude" } = body;

      // Apply model-specific rate limiting
      modelSpecificLimiter(model)(req, res, () => {
        // Generate context-aware suggestions
        const suggestions = [
          "Turn on the lights in the living room",
          "Set the temperature to 72 degrees",
          "Show me the current state of all devices",
          "Start the evening routine",
        ];

        res.json({ suggestions });
      });
    } catch (error) {
      next(error);
    }
  },
);

// Apply error handler
router.use(errorHandler);

export default router;
