import { Router } from 'express';
import { McpController } from '../controllers/mcpController.js';

const router = Router();

router.get('/status', McpController.getStatus);
router.get('/tools', McpController.getTools);
router.post('/call-tool', McpController.callTool);
router.post('/chat', McpController.chat);

export default router;
