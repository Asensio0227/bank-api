const reportsOnTransactions = async (req, res) => {
  res.status(StatusCodes.OK).json({ msg: 'reports On Transactions' });
};

const auditLogs = async (req, res) => {
  res.status(StatusCodes.OK).json({ msg: 'audit Logs' });
};

module.exports = {
  reportsOnTransactions,
  auditLogs,
};
