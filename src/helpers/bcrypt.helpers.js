const bcrypt = require("bcrypt");
const saltRounds = 10;

const hashPassword = (plainPassword) => {
  return new Promise((resolve) => {
    resolve(bcrypt.hashSync(plainPassword, saltRounds));
  });
};

const comparePassword = (plainPass, passFromDb) => {
  return new Promise((resolve, reject) => {
    bcrypt.compare(plainPass, passFromDb, function (err, result) {
      resolve(result);
    });
  });
};
module.exports = {
  hashPassword,
  comparePassword,
};
