const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    console.log('Token received:', token); // Log the token

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Decoded token:', decoded); // Log the decoded payload

    const user = await User.findOne({ _id: decoded._id});
    console.log('User found:', user); // Log the found user

    if (!user) throw new Error();

    req.token = token;
    req.user = user;
    next();
  } catch (error) {
    console.error('Authentication error:', error); // Log the error
    res.status(401).send({ error: 'Not authorized' });
  }
};

module.exports = auth;
