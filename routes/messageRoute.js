const express = require('express');
const router = express.Router();

const { authorizedPermissions } = require('../middleware/authentication');

const {
  createMsg,
  retrieveAllMsg,
  deleteMsg,
  retrieveAdminAllMsg,
  updateMsg,
} = require('../controllers/messageController');

router.route('/').post(createMsg);
router.route('/:roomId').get(retrieveAllMsg);
router.route('/:roomId').put(updateMsg);
router.route('/:id').delete(deleteMsg);
router
  .route('/admin/:roomId')
  .get(authorizedPermissions('admin', 'member'), retrieveAdminAllMsg);

module.exports = router;
