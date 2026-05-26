const express = require('express');
const { createOrder, getOrders, updateStatus, assignDriverToOrder } = require('../controllers/orderController');
const { protect, authorize } = require('../middlewares/auth');
const Order = require('../models/Order');
const router = express.Router();
router.use(protect);
router.route('/')
  .get(getOrders)
  .post(authorize('client'), createOrder);

router.put('/:id/assign', protect, authorize('proprietaire'), assignDriverToOrder);

router.route('/:id/status').put(authorize('chauffeur', 'proprietaire'), updateStatus);


router.get('/client/:clientId', async (req, res) => {
  try {
    const { clientId } = req.params;

    // Maintenant, "Order" est défini et Mongoose va pouvoir chercher dans MongoDB !
    const clientOrders = await Order.find({ client: clientId }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: clientOrders.length,
      data: clientOrders
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Erreur lors de la récupération des commandes du client."
    });
  }
});


module.exports = router;