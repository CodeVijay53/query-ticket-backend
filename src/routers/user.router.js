const express = require("express");
const { route } = require("./ticket.router");
const router = express.Router();

const {
  insertUser,
  getUserByEmail,
  getUserById,
  updatePassword,
  storeUserRefreshJWT,
} = require("../model/User.model");
const { createAccessJWT, createRefreshJWT } = require("../helpers/jwt.helper");
const { hashPassword, comparePassword } = require("../helpers/bcrypt.helpers");
const {
  userAuthorization,
} = require("../middlewares/authorization.middleware");
const { emailProcessor } = require("../helpers/email.helper");
const {
  setPasswordRestPin,
  getPinByEmailPin,
  deletePin,
} = require("../model/resetPin/ResetPin.model");

const {
  resetPassReqValidation,
  updatePassValidation,
  newUserValidation,
} = require("../middlewares/formvalidation.middleware");

const { deleteJWT } = require("../helpers/redis.helper");
router.all("/", (req, res, next) => {
  // res.json({ message: "return from user router" });
  next();
});

//Get user profile router
router.get("/", userAuthorization, async (req, res) => {
  const _id = req.userId;
  const userProf = await getUserById(_id);
  const { name, email } = userProf;
  res.json({
    user: {
      _id,
      name,
      email,
    },
  });
});

router.post("/", async (req, res) => {
  const { name, company, address, phone, email, password } = req.body;
  try {
    const hashedpass = await hashPassword(password);
    const newUserObj = {
      name,
      company,
      address,
      phone,
      email,
      password: hashedpass,
    };
    const result = await insertUser(newUserObj);
    console.log(result);
    res.json({ message: "New user created", result });
  } catch (error) {
    res.json({ status: "error", message: error.message });
  }
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.json({ status: "error", message: "Invalid form submission" });
  }
  const user = await getUserByEmail(email);

  const passFromDb = user && user._id ? user.password : null;

  if (!passFromDb)
    return res.json({ status: "error", message: "Invalid Email or password" });

  const result = await comparePassword(password, passFromDb);
  if (!result) {
    res.json({ status: "error", message: "Invalid Email or password" });
  }
  const accessJWT = await createAccessJWT(user.email, `${user._id}`);
  const refreshJWT = await createRefreshJWT(user.email, `${user._id}`);
  res.json({
    status: "success",
    message: "Login Successfully!",
    accessJWT,
    refreshJWT,
  });
  console.log(result);
});

router.post("/reset-password", resetPassReqValidation, async (req, res) => {
  const { email } = req.body;

  const user = await getUserByEmail(email);

  if (user && user._id) {
    const setPin = await setPasswordRestPin(email);
    await emailProcessor({
      email,
      pin: setPin.pin,
      type: "request-new-password",
    });
  }

  res.json({
    status: "success",
    message:
      "If the email is exist in our database, the password reset pin will be sent shortly.",
  });
});

router.patch("/reset-password", updatePassValidation, async (req, res) => {
  const { email, pin, newPassword } = req.body;

  const getPin = await getPinByEmailPin(email, pin);

  //validate pin

  if (getPin?._id) {
    const dbDate = getPin.addedAt;
    const expiresIn = 1;

    let expDate = dbDate.setDate(dbDate.getDate() + expiresIn);

    const today = new Date();

    if (today > expDate) {
      return res.json({ status: "error", message: "Invalid or expired pin." });
    }

    // encrypt new password
    const hashPassword = await hashPassword(newPassword);

    const user = await updatePassword(email, hashPassword);

    if (user._id) {
      // send email notification
      await emailProcessor({ email, type: "update-password-success" });

      ////delete pin from db
      deletePin(email, pin);

      return res.json({
        status: "success",
        message: "Your password has been updated",
      });
    }
  }
  res.json({
    status: "error",
    message: "Unable to update your password. Please try again later!",
  });
});

//user logout and invalidjson web token
router.delete("/logout", userAuthorization, async (req, res) => {
  const { authorization } = req.headers;
  //this data coming form database
  const _id = req.userId;

  // 2. delete accessJWT from redis database
  deleteJWT(authorization);

  // 3. delete refreshJWT from mongodb
  const result = await storeUserRefreshJWT(_id, "");

  if (result._id) {
    return res.json({ status: "success", message: "Logged out successfully" });
  }

  res.json({
    status: "error",
    message: "Unable to logout Please try again later",
  });
});

module.exports = router;
