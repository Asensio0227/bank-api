const express = require('express');
const router = express.Router();

const { authorizedPermissions } = require('../middleware/authentication');

const {
  createMsg,
  retrieveAllMsg,
  deleteMsg,
  retrieveMsg,
} = require('../controllers/messageController');

router.route('/').post(createMsg);
router.route('/').get(retrieveAllMsg);
router
  .route('/:id')
  .delete(authorizedPermissions('admin', 'member'), deleteMsg);
router
  .route('/admin')
  .get(authorizedPermissions('admin', 'member'), retrieveMsg);

module.exports = router;
