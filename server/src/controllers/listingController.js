import { Listing, User, AuditLog } from '../models/index.js';

export class ListingController {
  // Search & Filter Listings (Hybrid query)
  static async getListings(req, res, next) {
    try {
      const {
        q,
        category,
        type,
        minPrice,
        maxPrice,
        minRating,
        maxTurnaroundDays,
        businessId,
        status = 'active',
      } = req.query;

      const filter = {};
      if (status && status !== 'ALL') filter.status = status;
      if (category && category !== 'ALL') filter.category = category;
      if (type && type !== 'ALL') filter.type = type;
      if (businessId) filter.businessId = businessId;

      if (minPrice || maxPrice) {
        filter.priceCents = {};
        if (minPrice) filter.priceCents.$gte = Math.round(Number(minPrice) * 100);
        if (maxPrice) filter.priceCents.$lte = Math.round(Number(maxPrice) * 100);
      }

      if (minRating) {
        filter.rating = { $gte: Number(minRating) };
      }

      if (maxTurnaroundDays) {
        filter.deliveryTurnaroundDays = { $lte: Number(maxTurnaroundDays) };
      }

      if (q && q.trim()) {
        filter.$text = { $search: q.trim() };
      }

      const listings = await Listing.find(filter)
        .populate('businessId', 'email businessProfile')
        .sort(q ? { score: { $meta: 'textScore' } } : { createdAt: -1 });

      res.json(listings);
    } catch (err) {
      next(err);
    }
  }

  // Get single listing
  static async getListingById(req, res, next) {
    try {
      const listing = await Listing.findById(req.params.id).populate(
        'businessId',
        'email businessProfile'
      );
      if (!listing) {
        return res.status(404).json({ error: 'Listing not found' });
      }
      res.json(listing);
    } catch (err) {
      next(err);
    }
  }

  // Create Listing (Business role only)
  static async createListing(req, res, next) {
    try {
      const {
        title,
        description,
        category,
        type,
        price,
        priceFloor,
        priceCeiling,
        stockOrCapacity,
        deliveryTurnaroundDays,
        planOptions,
        milestoneTemplates,
        imageUrl,
        location,
      } = req.body;

      if (!title || !category || !type || price === undefined) {
        return res.status(400).json({ error: 'title, category, type, and price are required' });
      }

      const priceCents = Math.round(Number(price) * 100);
      const floorCents = priceFloor !== undefined ? Math.round(Number(priceFloor) * 100) : Math.round(priceCents * 0.85);
      const ceilingCents = priceCeiling !== undefined ? Math.round(Number(priceCeiling) * 100) : Math.round(priceCents * 1.25);

      if (floorCents > priceCents) {
        return res.status(400).json({ error: 'Price floor cannot exceed the listing price' });
      }

      if (ceilingCents < priceCents) {
        return res.status(400).json({ error: 'Price ceiling cannot be lower than the listing price' });
      }

      // Identify business owner
      let businessId = req.user?._id;
      if (!businessId) {
        // Fallback for demo: find or assign first business profile
        const bizUser = await User.findOne({ role: 'business' });
        businessId = bizUser?._id;
      }

      const listing = await Listing.create({
        businessId,
        title: title.trim(),
        description: description || '',
        category,
        type,
        priceCents,
        priceFloorCents: floorCents,
        priceCeilingCents: ceilingCents,
        stockOrCapacity: Number(stockOrCapacity) || 1,
        deliveryTurnaroundDays: Number(deliveryTurnaroundDays) || 1,
        planOptions: Array.isArray(planOptions) ? planOptions : [],
        milestoneTemplates: Array.isArray(milestoneTemplates) ? milestoneTemplates : [],
        imageUrl: imageUrl || '',
        location: location || { city: 'San Francisco', country: 'US' },
      });

      await AuditLog.create({
        actorType: 'seller_agent',
        actorId: req.user?.email || 'business_admin',
        action: 'LISTING_CREATED',
        entityType: 'listing',
        entityId: listing._id.toString(),
        details: {
          title: listing.title,
          priceCents: listing.priceCents,
          floorCents: listing.priceFloorCents,
          ceilingCents: listing.priceCeilingCents,
          type: listing.type,
        },
      });

      res.status(201).json(listing);
    } catch (err) {
      next(err);
    }
  }

  // Update Listing
  static async updateListing(req, res, next) {
    try {
      const listing = await Listing.findById(req.params.id);
      if (!listing) {
        return res.status(404).json({ error: 'Listing not found' });
      }

      // Check ownership if user authenticated
      if (req.user && req.user.role !== 'admin' && listing.businessId.toString() !== req.user._id?.toString()) {
        return res.status(403).json({ error: 'Forbidden: You can only edit your own listings' });
      }

      const updates = req.body;
      if (updates.price !== undefined) updates.priceCents = Math.round(Number(updates.price) * 100);
      if (updates.priceFloor !== undefined) updates.priceFloorCents = Math.round(Number(updates.priceFloor) * 100);
      if (updates.priceCeiling !== undefined) updates.priceCeilingCents = Math.round(Number(updates.priceCeiling) * 100);

      Object.assign(listing, updates);
      await listing.save();

      await AuditLog.create({
        actorType: 'seller_agent',
        actorId: req.user?.email || 'business_admin',
        action: 'LISTING_UPDATED',
        entityType: 'listing',
        entityId: listing._id.toString(),
        details: { updates },
      });

      res.json(listing);
    } catch (err) {
      next(err);
    }
  }

  // Delete / Archive Listing
  static async deleteListing(req, res, next) {
    try {
      const listing = await Listing.findById(req.params.id);
      if (!listing) {
        return res.status(404).json({ error: 'Listing not found' });
      }

      await Listing.findByIdAndDelete(req.params.id);

      await AuditLog.create({
        actorType: 'seller_agent',
        actorId: req.user?.email || 'business_admin',
        action: 'LISTING_DELETED',
        entityType: 'listing',
        entityId: req.params.id,
      });

      res.json({ message: 'Listing deleted successfully', id: req.params.id });
    } catch (err) {
      next(err);
    }
  }
}
