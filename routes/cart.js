const express = require('express');
const router  = express.Router();
const Cart    = require('../models/Cart');
const Product = require('../models/Product');

// ─── GET /cart ────────────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    // If no session user, show empty cart
    if (!req.session || !req.session.userId) {
      return res.render('cart', {
        title:     'My Cart',
        user:      null,
        cartItems: [],
        savedItems:[],
        subtotal:  0,
        discount:  0,
        tax:       0,
        total:     0
      });
    }

    let cart = await Cart.findOne({ userId: req.session.userId });

    if (!cart) {
      cart = await Cart.create({ userId: req.session.userId, items: [] });
    }

    // Separate active vs saved-for-later
    const activeItems = cart.items.filter(i => !i.savedForLater);
    const savedItems  = cart.items.filter(i =>  i.savedForLater);

    // Build cartItems array that matches what cart.ejs expects:
    // item._id, item.product.name, item.product.price, item.product.image,
    // item.quantity, item.seller
    const cartItems = activeItems.map(i => ({
      _id:     i._id,
      product: {
        name:  i.name,
        price: i.price,
        image: i.image
      },
      quantity: i.quantity,
      seller:   i.seller
    }));

    const savedItemsMapped = savedItems.map(i => ({
      _id:     i._id,
      product: {
        name:  i.name,
        price: i.price,
        image: i.image
      },
      quantity: i.quantity,
      seller:   i.seller
    }));

    const subtotal = cartItems.reduce((sum, i) => sum + (i.product.price * i.quantity), 0);
    const discount = cart.discount || 0;
    const tax      = parseFloat((subtotal * 0.01).toFixed(2));
    const total    = parseFloat((subtotal - discount + tax).toFixed(2));

    res.render('cart', {
      title:     'My Cart',
      user:      req.session.user || null,
      cartItems,
      savedItems: savedItemsMapped,
      subtotal,
      discount,
      tax,
      total
    });

  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error: ' + err.message);
  }
});

// ─── POST /cart/add ───────────────────────────────────────────────────────────
router.post('/add', async (req, res) => {
  try {
    const { productId, quantity = 1 } = req.body;

    // Guest users: redirect to login
    if (!req.session || !req.session.userId) {
      return res.redirect('/login');
    }

    const product = await Product.findById(productId);
    if (!product) return res.status(404).send('Product not found');

    let cart = await Cart.findOne({ userId: req.session.userId });
    if (!cart) cart = await Cart.create({ userId: req.session.userId, items: [] });

    // Check if already in cart (active, not saved)
    const existing = cart.items.find(
      i => i.productId && i.productId.toString() === productId && !i.savedForLater
    );

    if (existing) {
      existing.quantity += parseInt(quantity);
    } else {
      cart.items.push({
        productId:     product._id,
        name:          product.name,
        image:         product.image || '',
        price:         product.price,
        quantity:      parseInt(quantity),
        seller:        product.seller || 'Brand Store',
        savedForLater: false
      });
    }

    cart.updatedAt = Date.now();
    await cart.save();

    // If "Buy Now" button was clicked, go straight to checkout
    if (req.body.buyNow) return res.redirect('/checkout');

    res.redirect('/cart');

  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error: ' + err.message);
  }
});

// ─── POST /cart/remove/:itemId ────────────────────────────────────────────────
router.post('/remove/:itemId', async (req, res) => {
  try {
    if (!req.session || !req.session.userId) return res.redirect('/cart');

    const cart = await Cart.findOne({ userId: req.session.userId });
    if (cart) {
      cart.items.pull({ _id: req.params.itemId });
      await cart.save();
    }
    res.redirect('/cart');

  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error: ' + err.message);
  }
});

// ─── POST /cart/clear ─────────────────────────────────────────────────────────
router.post('/clear', async (req, res) => {
  try {
    if (!req.session || !req.session.userId) return res.redirect('/cart');

    await Cart.findOneAndUpdate(
      { userId: req.session.userId },
      { items: [], discount: 0, couponCode: null }
    );
    res.redirect('/cart');

  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error: ' + err.message);
  }
});

// ─── POST /cart/update-qty ────────────────────────────────────────────────────
router.post('/update-qty', async (req, res) => {
  try {
    if (!req.session || !req.session.userId) return res.redirect('/cart');

    const { itemId, quantity } = req.body;
    const cart = await Cart.findOne({ userId: req.session.userId });

    if (cart) {
      const item = cart.items.id(itemId);
      if (item) {
        item.quantity = parseInt(quantity);
        await cart.save();
      }
    }
    res.redirect('/cart');

  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error: ' + err.message);
  }
});

// ─── POST /cart/save-for-later/:itemId ────────────────────────────────────────
router.post('/save-for-later/:itemId', async (req, res) => {
  try {
    if (!req.session || !req.session.userId) return res.redirect('/cart');

    const cart = await Cart.findOne({ userId: req.session.userId });
    if (cart) {
      const item = cart.items.id(req.params.itemId);
      if (item) { item.savedForLater = true; await cart.save(); }
    }
    res.redirect('/cart');

  } catch (err) {
    res.status(500).send('Server Error: ' + err.message);
  }
});

// ─── POST /cart/move-to-cart/:itemId ──────────────────────────────────────────
router.post('/move-to-cart/:itemId', async (req, res) => {
  try {
    if (!req.session || !req.session.userId) return res.redirect('/cart');

    const cart = await Cart.findOne({ userId: req.session.userId });
    if (cart) {
      const item = cart.items.id(req.params.itemId);
      if (item) { item.savedForLater = false; await cart.save(); }
    }
    res.redirect('/cart');

  } catch (err) {
    res.status(500).send('Server Error: ' + err.message);
  }
});

// ─── POST /cart/apply-coupon ──────────────────────────────────────────────────
router.post('/apply-coupon', async (req, res) => {
  try {
    if (!req.session || !req.session.userId) return res.redirect('/cart');

    const { couponCode } = req.body;
    const coupons = { SAVE10: 10, SAVE20: 20, WELCOME: 60 };
    const discount = coupons[couponCode?.toUpperCase()];

    if (discount) {
      await Cart.findOneAndUpdate(
        { userId: req.session.userId },
        { couponCode: couponCode.toUpperCase(), discount }
      );
    }
    res.redirect('/cart');

  } catch (err) {
    res.status(500).send('Server Error: ' + err.message);
  }
});

module.exports = router;