const Joi = require("joi");

const validateBook = (data) => {
  const schema = Joi.object({
    title: Joi.string().required().trim(),
    caption: Joi.string().required().trim(),
    rating: Joi.number().required().max(5).min(1),
  });
  return schema.validate(data);
};

module.exports = validateBook;
