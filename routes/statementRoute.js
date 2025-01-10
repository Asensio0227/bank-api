const express = require('express');
const router = express.Router();

const {
  retrieveBankStatement,
  retrieveSingleStatement,
  retrieveAllUserStatement,
  retrieveAllStatement,
} = require('../controllers/statementController');
const { authorizedPermissions } = require('../middleware/authentication');

router.route('/:accountNumber').post(retrieveBankStatement);
router
  .route('/admin')
  .get(
    authorizedPermissions('admin', 'member', 'assistant'),
    retrieveAllStatement
  );
router.route('/').get(retrieveAllUserStatement);
router.route('/:id').get(retrieveSingleStatement);

module.exports = router;
