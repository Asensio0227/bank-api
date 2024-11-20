const createTokenUser = (user) => {
  return {
    fName: `${user.firstName},${user.lastName}`,
    userId: user._id,
    roles: user.roles,
    avatar: user.avatar,
  };
};

module.exports = createTokenUser;
