import { Router } from 'express';
import { ListingController } from '../controllers/listingController.js';
import { authenticate, requireRole } from '../middleware/authMiddleware.js';

const router = Router();

// Public / Customer browsing
router.get('/', ListingController.getListings);
router.get('/:id', ListingController.getListingById);

// Role-Guarded: Only 'business' or 'admin' can create or mutate listings
router.post('/', authenticate, requireRole('business', 'admin'), ListingController.createListing);
router.put('/:id', authenticate, requireRole('business', 'admin'), ListingController.updateListing);
router.delete('/:id', authenticate, requireRole('business', 'admin'), ListingController.deleteListing);

export default router;
