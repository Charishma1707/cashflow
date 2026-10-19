import { McpService } from '../services/mcpService.js';

export class McpController {
  static async getStatus(req, res, next) {
    try {
      const status = await McpService.checkRemoteMcpStatus();
      res.json(status);
    } catch (err) {
      next(err);
    }
  }

  static async getTools(req, res, next) {
    try {
      const tools = McpService.getToolDefinitions();
      res.json({
        server: 'PayPal Remote MCP Server',
        remoteUrl: McpService.getRemoteUrl(),
        tools,
      });
    } catch (err) {
      next(err);
    }
  }

  static async callTool(req, res, next) {
    try {
      const { tool, arguments: args } = req.body;
      if (!tool) {
        return res.status(400).json({ error: 'tool name is required' });
      }

      const result = await McpService.executeTool(tool, args || {});
      res.json({
        jsonrpc: '2.0',
        result,
      });
    } catch (err) {
      next(err);
    }
  }

  static async chat(req, res, next) {
    try {
      const { message, history, context = {}, role, clientEmail } = req.body;
      if (!message || !message.trim()) {
        return res.status(400).json({ error: 'Message cannot be empty' });
      }

      const mergedContext = {
        ...context,
        ...(role ? { role } : {}),
        ...(clientEmail ? { clientEmail } : {}),
      };

      const response = await McpService.chat(message, history || [], mergedContext);
      res.json(response);
    } catch (err) {
      next(err);
    }
  }
}
