const createTokenUser = (user) => {
  return {
    fName: `${user.firstName},${user.lastName}`,
    userId: user._id,
    roles: user.roles,
  };
};

module.exports = createTokenUser;
