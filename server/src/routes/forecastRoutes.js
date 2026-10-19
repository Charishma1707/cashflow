import express from 'express';
import { ForecastController } from '../controllers/forecastController.js';

const router = express.Router();

router.get('/', ForecastController.getForecast);

export default router;
