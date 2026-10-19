import { Product } from '../models/index.js';

export class ProductController {
  // Get all products (with optional search, category, availability filter)
  static async getProducts(req, res, next) {
    try {
      const { category, search, availableOnly } = req.query;
      const query = {};

      if (category && category !== 'All') {
        query.category = category;
      }

      if (availableOnly === 'true') {
        query.isAvailable = true;
      }

      if (search) {
        query.$or = [
          { title: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
          { sku: { $regex: search, $options: 'i' } },
        ];
      }

      const products = await Product.find(query).sort({ createdAt: -1 });
      res.json(products);
    } catch (err) {
      next(err);
    }
  }

  // Get single product by ID
  static async getProductById(req, res, next) {
    try {
      const product = await Product.findById(req.params.id);
      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }
      res.json(product);
    } catch (err) {
      next(err);
    }
  }

  // Create new product (Owner action)
  static async createProduct(req, res, next) {
    try {
      const { sku, title, description, category, priceCents, stock, imageUrl, badge } = req.body;

      if (!sku || !title || priceCents === undefined) {
        return res.status(400).json({ error: 'SKU, title, and price are required' });
      }

      const existing = await Product.findOne({ sku: sku.toUpperCase() });
      if (existing) {
        return res.status(409).json({ error: 'A product with this SKU already exists' });
      }

      const product = await Product.create({
        sku: sku.toUpperCase(),
        title,
        description: description || '',
        category: category || 'General',
        priceCents: Math.round(Number(priceCents)),
        stock: Number(stock) || 0,
        imageUrl: imageUrl || '',
        badge: badge || '',
        isAvailable: Number(stock) > 0,
      });

      res.status(201).json(product);
    } catch (err) {
      next(err);
    }
  }

  // Update product (Owner action)
  static async updateProduct(req, res, next) {
    try {
      const { title, description, category, priceCents, stock, imageUrl, badge, isAvailable } = req.body;
      const product = await Product.findById(req.params.id);
      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }

      if (title !== undefined) product.title = title;
      if (description !== undefined) product.description = description;
      if (category !== undefined) product.category = category;
      if (priceCents !== undefined) product.priceCents = Math.round(Number(priceCents));
      if (stock !== undefined) {
        product.stock = Number(stock);
        product.isAvailable = product.stock > 0;
      }
      if (imageUrl !== undefined) product.imageUrl = imageUrl;
      if (badge !== undefined) product.badge = badge;
      if (isAvailable !== undefined) product.isAvailable = isAvailable;

      await product.save();
      res.json(product);
    } catch (err) {
      next(err);
    }
  }

  // Delete / Archive product
  static async deleteProduct(req, res, next) {
    try {
      const product = await Product.findByIdAndDelete(req.params.id);
      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }
      res.json({ message: 'Product deleted successfully', id: req.params.id });
    } catch (err) {
      next(err);
    }
  }
}
