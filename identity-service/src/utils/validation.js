const Joi = require("joi");

const validateRegisteration = (data) => {
  const schema = Joi.object({
    username: Joi.string().min(6).max(30).required(),
    email: Joi.string().email().required(),
    password: Joi.string().required().min(6).max(50),
  });
  return schema.validate(data);
};

module.exports = { validateRegisteration };
