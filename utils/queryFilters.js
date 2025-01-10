function createQueryFilters(req, sort, sortKeys) {
  const sortOptions = {
    newest: '-createdAt',
    oldest: 'createdAt',
    'a-z': `${sortKeys}`,
    'z-a': `-${sortKeys}`,
  };

  const sortKey = sortOptions[sort] || sortOptions.newest;
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  return {
    sortKey,
    skip,
    limit,
    page,
  };
}

module.exports = createQueryFilters;
