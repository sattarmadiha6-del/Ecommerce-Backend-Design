const express   = require('express');
const router    = express.Router();
const Product   = require('../models/Product');
const { isAdmin } = require('../middleware/auth');

// ─────────────────────────────────────────────
// GET /admin/products — Product list + Add form
// ─────────────────────────────────────────────
router.get('/admin/products', isAdmin, async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    res.render('admin-products', {
      title:    'Admin — Products',
      products,
      user:     req.session.user,
      success:  req.query.success || null,
      error:    req.query.error   || null
    });
  } catch (err) {
    res.status(500).send('Server Error: ' + err.message);
  }
});

// ─────────────────────────────────────────────
// POST /admin/products/add — Naya product add
// ─────────────────────────────────────────────
router.post('/admin/products/add', isAdmin, async (req, res) => {
  try {
    const {
      name, price, oldPrice, category,
      image, description, stock,
      rating, freeShipping
    } = req.body;

    // Validation
    if (!name || !price || !category) {
      return res.redirect('/admin/products?error=Name, price and category are required');
    }

    await Product.create({
      name:         name.trim(),
      price:        parseFloat(price),
      oldPrice:     oldPrice ? parseFloat(oldPrice) : 0,
      category:     category.toLowerCase().trim(),
      image:        image || '',
      description:  description || '',
      stock:        parseInt(stock) || 0,
      rating:       parseFloat(rating) || 0,
      freeShipping: freeShipping === 'on' ? true : false,
      orderCount:   0
    });

    res.redirect('/admin/products?success=Product added successfully!');

  } catch (err) {
    console.error(err);
    res.redirect('/admin/products?error=' + err.message);
  }
});

// ─────────────────────────────────────────────
// POST /admin/products/delete/:id — Product delete
// ─────────────────────────────────────────────
router.post('/admin/products/delete/:id', isAdmin, async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    res.redirect('/admin/products?success=Product deleted!');
  } catch (err) {
    res.redirect('/admin/products?error=' + err.message);
  }
});

module.exports = router;