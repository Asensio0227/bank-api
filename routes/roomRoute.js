const express = require('express');
const router = express.Router();

const { authorizedPermissions } = require('../middleware/authentication');

const {
  createRoom,
  retrieveAllRoom,
  retrieveAllUserRooms,
  deleteRoom,
  updateRoom,
  retrieveSingleRoom,
} = require('../controllers/roomController');

router.route('/').post(createRoom);
router.route('/admin').get(retrieveAllRoom);
router.route('/').get(retrieveAllUserRooms);
router.route('/:id').delete(authorizedPermissions('admin'), deleteRoom);
router
  .route('/:id')
  .patch(authorizedPermissions('admin', 'member', 'assistant'), updateRoom);
router.route('/:id').get(retrieveSingleRoom);

module.exports = router;
