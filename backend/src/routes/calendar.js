import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { getDatesForMonth } from '../data/importantDates.js';

const router = Router();
router.use(authenticate);

/* GET /calendar/important-dates?month=6&year=2026 */
router.get('/important-dates', (req, res) => {
  const month = Number(req.query.month) || new Date().getMonth() + 1;
  const year  = Number(req.query.year)  || new Date().getFullYear();
  const dates = getDatesForMonth(month, year);
  res.json({ dates, month, year });
});

export default router;
