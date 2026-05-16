const express = require('express');
const router  = express.Router();
const Product = require('../models/Product');

// Cart model — optional
let Cart;
try {
  Cart = require('../models/Cart');
} catch (e) {
  Cart = null;
}

const categories = [
  { name: 'Electronics', slug: 'electronics' },
  { name: 'Fashion',     slug: 'fashion'     },
  { name: 'Home',        slug: 'home'        },
  { name: 'Accessories', slug: 'accessories' },
  { name: 'Sports',      slug: 'sports'      }
];

// ─────────────────────────────────────────────
// HELPER: Cart Count for navbar
// ─────────────────────────────────────────────
async function getCartCount(req) {
  try {
    if (Cart && req.session && req.session.userId) {
      const cart = await Cart.findOne({ userId: req.session.userId });
      if (!cart) return 0;
      return cart.items
        .filter(i => !i.savedForLater)
        .reduce((sum, i) => sum + i.quantity, 0);
    }
    if (req.session && req.session.cart) {
      return req.session.cart.reduce((sum, i) => sum + i.quantity, 0);
    }
    return 0;
  } catch (e) {
    return 0;
  }
}

// ─────────────────────────────────────────────
// HOME — login required
// ─────────────────────────────────────────────
router.get('/', async (req, res) => {
  // Login nahi hai toh login page par bhejo
  if (!req.session || !req.session.user) {
    return res.redirect('/login');
  }

  try {
    const allProducts    = await Product.find().limit(20);
    const homeProds      = await Product.find({ category: 'home' }).limit(8);
    const elecProds      = await Product.find({ category: 'electronics' }).limit(8);
    const recommended    = await Product.find().sort({ orderCount: -1 }).limit(10);
    const cartCount      = await getCartCount(req);

    res.render('home', {
      title:               'Home',
      dealProducts:        allProducts,
      homeProducts:        homeProds.length > 0 ? homeProds : allProducts,
      electronicsProducts: elecProds.length > 0 ? elecProds : allProducts,
      recommendedProducts: recommended.length > 0 ? recommended : allProducts,
      user:                req.session.user || null,
      searchQuery:         '',
      cartCount
    });
  } catch (err) {
    res.status(500).send('Server Error: ' + err.message);
  }
});

// ─────────────────────────────────────────────
// PRODUCT LISTING — listing.ejs
// ─────────────────────────────────────────────
router.get('/products', async (req, res) => {
  // Login check
  if (!req.session || !req.session.user) {
    return res.redirect('/login');
  }

  try {
    const search   = req.query.search   || '';
    const category = req.query.category || '';
    const minPrice = req.query.minPrice || '';
    const maxPrice = req.query.maxPrice || '';
    const sort     = req.query.sort     || 'featured';
    const page     = parseInt(req.query.page) || 1;
    const limit    = 8;

    let filter = {};

    if (search) {
      filter.$or = [
        { name:        { $regex: search, $options: 'i' } },
        { category:    { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    if (category && category !== 'all') {
      filter.category = { $regex: category, $options: 'i' };
    }

    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }

    let sortOption = {};
    if (sort === 'low')  sortOption = { price:  1 };
    if (sort === 'high') sortOption = { price: -1 };

    const totalItems = await Product.countDocuments(filter);
    const totalPages = Math.ceil(totalItems / limit) || 1;
    const safePage   = Math.min(Math.max(page, 1), totalPages);

    const products  = await Product.find(filter)
      .sort(sortOption)
      .skip((safePage - 1) * limit)
      .limit(limit);

    const catObj       = categories.find(c => c.slug === category);
    const categoryName = catObj ? catObj.name : 'All Products';
    const cartCount    = await getCartCount(req);

    res.render('listing', {
      title:       categoryName,
      products,
      categories,
      categoryName,
      totalItems,
      totalPages,
      currentPage: safePage,
      cartCount,
      user:        req.session.user || null,
      query:       { search, category, minPrice, maxPrice, sort }
    });

  } catch (err) {
    res.status(500).send('Server Error: ' + err.message);
  }
});

// ─────────────────────────────────────────────
// PRODUCT DETAIL — detail.ejs
// ─────────────────────────────────────────────
router.get('/product/:id', async (req, res) => {
  if (!req.session || !req.session.user) {
    return res.redirect('/login');
  }

  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).send('Product not found. <a href="/products">Go back</a>');
    }

    const relatedProducts = await Product.find({
      category: product.category,
      _id: { $ne: product._id }
    }).limit(6);

    const similarProducts = await Product.find({
      _id: { $ne: product._id }
    }).limit(5);

    const cartCount = await getCartCount(req);

    res.render('detail', {
      title:           product.name,
      product,
      relatedProducts,
      similarProducts,
      reviews:         [],
      cartCount,
      user:            req.session.user || null
    });

  } catch (err) {
    res.status(500).send('Server Error: ' + err.message);
  }
});

// ─────────────────────────────────────────────
// GRIDVIEW — gridview.ejs
// ─────────────────────────────────────────────
router.get('/gridview', async (req, res) => {
  if (!req.session || !req.session.user) {
    return res.redirect('/login');
  }

  try {
    const search = req.query.search || '';
    const sort   = req.query.sort   || 'featured';

    let filter = {};
    if (search) {
      filter.$or = [
        { name:        { $regex: search, $options: 'i' } },
        { category:    { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    let sortOption = {};
    if (sort === 'low')  sortOption = { price:  1 };
    if (sort === 'high') sortOption = { price: -1 };

    const products  = await Product.find(filter).sort(sortOption);
    const cartCount = await getCartCount(req);

    res.render('gridview', {
      title:    'Grid View',
      products,
      search,
      cartCount,
      user:     req.session.user || null
    });

  } catch (err) {
    res.status(500).send('Server Error: ' + err.message);
  }
});

// ─────────────────────────────────────────────
// CART PAGE — GET
// ─────────────────────────────────────────────
router.get('/cart', async (req, res) => {
  if (!req.session || !req.session.user) {
    return res.redirect('/login');
  }

  try {
    let cartItems  = [];
    let savedItems = [];

    if (Cart && req.session.userId) {
      const cart = await Cart.findOne({ userId: req.session.userId });
      if (cart) {
        cartItems = cart.items.filter(i => !i.savedForLater).map(i => ({
          _id:      i._id,
          product:  { name: i.name, price: i.price, image: i.image },
          quantity: i.quantity,
          seller:   i.seller || 'Brand Store'
        }));
        savedItems = cart.items.filter(i => i.savedForLater).map(i => ({
          _id:      i._id,
          product:  { name: i.name, price: i.price, image: i.image },
          quantity: i.quantity
        }));
      }
    } else {
      cartItems = [
        {
          _id: '1',
          product: {
            name:  'Classic T-Shirt',
            price: 29.00,
            image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=200&q=80'
          },
          quantity: 2,
          seller: 'Artel Market'
        },
        {
          _id: '2',
          product: {
            name:  'Travel Backpack',
            price: 49.00,
            image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=200&q=80'
          },
          quantity: 1,
          seller: 'Best Factory LLC'
        },
        {
          _id: '3',
          product: {
            name:  'Smart Watch',
            price: 99.00,
            image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200&q=80'
          },
          quantity: 1,
          seller: 'Artel Market'
        }
      ];

      savedItems = [
        {
          _id: 's1',
          product: {
            name:  'DSLR Camera 24MP',
            price: 599.00,
            image: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=200&q=80'
          },
          quantity: 1
        },
        {
          _id: 's2',
          product: {
            name:  'Wireless Headphones',
            price: 79.00,
            image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=200&q=80'
          },
          quantity: 1
        },
        {
          _id: 's3',
          product: {
            name:  'Running Shoes',
            price: 120.00,
            image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=200&q=80'
          },
          quantity: 1
        },
        {
          _id: 's4',
          product: {
            name:  'Laptop Pro',
            price: 999.00,
            image: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=200&q=80'
          },
          quantity: 1
        }
      ];
    }

    const subtotal = cartItems.reduce((sum, i) => sum + (i.product.price * i.quantity), 0);
    const tax      = parseFloat((subtotal * 0.01).toFixed(2));
    const discount = 0;
    const total    = parseFloat((subtotal + tax - discount).toFixed(2));

    res.render('cart', {
      title:     'My Cart',
      cartItems,
      savedItems,
      subtotal:  parseFloat(subtotal.toFixed(2)),
      tax,
      discount,
      total,
      user:      req.session.user || null
    });

  } catch (err) {
    res.status(500).send('Server Error: ' + err.message);
  }
});

// ─────────────────────────────────────────────
// CART — ADD ITEM
// ─────────────────────────────────────────────
router.post('/cart/add', async (req, res) => {
  if (!req.session || !req.session.user) {
    return res.redirect('/login');
  }

  try {
    const { productId, quantity } = req.body;
    const qty = parseInt(quantity) || 1;

    if (Cart && req.session.userId) {
      const product = await Product.findById(productId);
      if (!product) return res.redirect('/products');

      let cart = await Cart.findOne({ userId: req.session.userId });
      if (!cart) cart = new Cart({ userId: req.session.userId, items: [] });

      const existing = cart.items.find(
        i => i.productId && i.productId.toString() === productId && !i.savedForLater
      );

      if (existing) {
        existing.quantity += qty;
      } else {
        cart.items.push({
          productId: product._id,
          name:      product.name,
          image:     product.image || '',
          price:     product.price,
          quantity:  qty,
          seller:    product.seller || 'Brand Store'
        });
      }
      await cart.save();
    } else {
      if (!req.session.cart) req.session.cart = [];
      const existing = req.session.cart.find(i => i.productId === productId);
      if (existing) {
        existing.quantity += qty;
      } else {
        req.session.cart.push({ productId, quantity: qty });
      }
    }

    if (req.body.buyNow) return res.redirect('/checkout');
    res.redirect('/cart');

  } catch (err) {
    res.status(500).send('Server Error: ' + err.message);
  }
});

// ─────────────────────────────────────────────
// CART — REMOVE ITEM
// ─────────────────────────────────────────────
router.post('/cart/remove/:itemId', async (req, res) => {
  try {
    if (Cart && req.session.userId) {
      await Cart.findOneAndUpdate(
        { userId: req.session.userId },
        { $pull: { items: { _id: req.params.itemId } } }
      );
    } else {
      req.session.cart = (req.session.cart || []).filter(
        i => i._id !== req.params.itemId
      );
    }
    res.redirect('/cart');
  } catch (err) {
    res.status(500).send('Server Error: ' + err.message);
  }
});

// ─────────────────────────────────────────────
// CART — CLEAR ALL
// ─────────────────────────────────────────────
router.post('/cart/clear', async (req, res) => {
  try {
    if (Cart && req.session.userId) {
      await Cart.findOneAndUpdate(
        { userId: req.session.userId },
        { $set: { items: [] } }
      );
    } else {
      req.session.cart = [];
    }
    res.redirect('/cart');
  } catch (err) {
    res.status(500).send('Server Error: ' + err.message);
  }
});

// ─────────────────────────────────────────────
// SUBSCRIBE
// ─────────────────────────────────────────────
router.post('/subscribe', (req, res) => {
  console.log('New subscriber:', req.body.email);
  res.redirect('back');
});

// ─────────────────────────────────────────────
// MOBILE HOME
// ─────────────────────────────────────────────
router.get('/mobile', async (req, res) => {
  try {
    const products = await Product.find().limit(10);
    res.render('mobile', {
      title:    'Mobile Home',
      products,
      user:     req.session.user || null
    });
  } catch (err) {
    res.status(500).send('Server Error: ' + err.message);
  }
});

// ─────────────────────────────────────────────
// MOBILE CART
// ─────────────────────────────────────────────
router.get('/mobile-cart', (req, res) => {
  const cartItems = [
    {
      _id: '1',
      product: {
        name:  'T-Shirt',
        price: 29.00,
        image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=200&q=80'
      },
      quantity: 2,
      seller: 'Artel Market'
    },
    {
      _id: '2',
      product: {
        name:  'Backpack',
        price: 49.00,
        image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=200&q=80'
      },
      quantity: 1,
      seller: 'Best Factory'
    }
  ];
  const subtotal = cartItems.reduce((sum, i) => sum + (i.product.price * i.quantity), 0);

  res.render('mobile-cart', {
    title:      'Mobile Cart',
    cartItems,
    savedItems: [],
    subtotal:   parseFloat(subtotal.toFixed(2)),
    tax:        parseFloat((subtotal * 0.01).toFixed(2)),
    discount:   0,
    total:      parseFloat((subtotal * 1.01).toFixed(2)),
    user:       req.session.user || null
  });
});

// ─────────────────────────────────────────────
// MOBILE ITEMS
// ─────────────────────────────────────────────
router.get('/mobile-items', async (req, res) => {
  try {
    const products = await Product.find();
    res.render('mobileitems', {
      title:   'Mobile Items',
      products,
      search:  req.query.search || '',
      user:    req.session.user || null
    });
  } catch (err) {
    res.status(500).send('Server Error: ' + err.message);
  }
});

// ─────────────────────────────────────────────
// ADD SAMPLE PRODUCTS
// ─────────────────────────────────────────────
router.get('/add-products', async (req, res) => {
  try {
    await Product.deleteMany({});
    await Product.insertMany([
      {
        name: 'Smart Watch', price: 99, oldPrice: 129, category: 'electronics',
        image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&q=80',
        description: 'Latest smart watch with health tracking, GPS and heart rate monitor.',
        stock: 50, rating: 4, orderCount: 120, freeShipping: true
      },
      {
        name: 'Laptop Pro', price: 999, oldPrice: 1199, category: 'electronics',
        image: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=500&q=80',
        description: 'High performance laptop with Intel i7, 16GB RAM and 512GB SSD.',
        stock: 20, rating: 5, orderCount: 85, freeShipping: true
      },
      {
        name: 'Classic T-Shirt', price: 29, oldPrice: 45, category: 'fashion',
        image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=500&q=80',
        description: 'Comfortable 100% cotton t-shirt available in multiple colors.',
        stock: 100, rating: 4, orderCount: 300, freeShipping: false
      },
      {
        name: 'Wireless Headphones', price: 79, oldPrice: 99, category: 'electronics',
        image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&q=80',
        description: 'Premium wireless headphones with active noise cancellation.',
        stock: 30, rating: 4, orderCount: 200, freeShipping: true
      },
      {
        name: 'Travel Backpack', price: 49, oldPrice: 69, category: 'accessories',
        image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=500&q=80',
        description: 'Durable travel backpack with dedicated laptop compartment.',
        stock: 40, rating: 3, orderCount: 150, freeShipping: false
      },
      {
        name: 'Running Shoes', price: 120, oldPrice: 160, category: 'fashion',
        image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500&q=80',
        description: 'Lightweight sports running shoes with advanced cushioning.',
        stock: 25, rating: 5, orderCount: 90, freeShipping: true
      },
      {
        name: 'DSLR Camera', price: 599, oldPrice: 699, category: 'electronics',
        image: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=500&q=80',
        description: 'Professional DSLR camera with 24MP sensor and 4K video.',
        stock: 15, rating: 5, orderCount: 60, freeShipping: true
      },
      {
        name: 'Coffee Maker', price: 89, oldPrice: 110, category: 'home',
        image: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=500&q=80',
        description: 'Automatic coffee maker with built-in grinder and timer.',
        stock: 35, rating: 4, orderCount: 180, freeShipping: false
      },
      {
        name: 'Leather Wallet', price: 35, oldPrice: 50, category: 'accessories',
        image: 'https://images.unsplash.com/photo-1627123424574-724758594e93?w=500&q=80',
        description: 'Slim genuine leather wallet with RFID blocking technology.',
        stock: 60, rating: 4, orderCount: 250, freeShipping: false
      },
      {
        name: 'Yoga Mat', price: 45, oldPrice: 60, category: 'sports',
        image: 'https://images.unsplash.com/photo-1601925228519-eb4fcbe01fe2?w=500&q=80',
        description: 'Non-slip premium yoga mat with alignment lines and carry strap.',
        stock: 45, rating: 4, orderCount: 130, freeShipping: true
      },
      {
        name: 'Modern Sofa', price: 850, oldPrice: 1100, category: 'home',
        image: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=500&q=80',
        description: 'Modern 3-seater sofa with premium fabric and solid wood frame.',
        stock: 8, rating: 5, orderCount: 40, freeShipping: false
      },
      {
        name: 'Gaming Headset', price: 65, oldPrice: 85, category: 'electronics',
        image: 'https://images.unsplash.com/photo-1599669454699-248893623440?w=500&q=80',
        description: 'Professional gaming headset with 7.1 surround sound and RGB.',
        stock: 35, rating: 4, orderCount: 175, freeShipping: true
      }
    ]);

    res.send(`
      <div style="font-family:sans-serif;padding:30px;text-align:center;">
        <h2>✅ 12 Products Added!</h2><br/>
        <a href="/products" style="padding:10px 20px;background:#1a73e8;color:#fff;border-radius:4px;text-decoration:none;margin:5px;">View Products</a>
        <a href="/" style="padding:10px 20px;background:#333;color:#fff;border-radius:4px;text-decoration:none;margin:5px;">Go Home</a>
        <a href="/cart" style="padding:10px 20px;background:#00b517;color:#fff;border-radius:4px;text-decoration:none;margin:5px;">View Cart</a>
        <a href="/gridview" style="padding:10px 20px;background:#ff9800;color:#fff;border-radius:4px;text-decoration:none;margin:5px;">Grid View</a>
      </div>
    `);
  } catch (err) {
    res.send('❌ Error: ' + err.message);
  }
});

module.exports = router;