const asyncHandler = require('express-async-handler');
const Category = require('../models/Category');
const Product = require('../models/Product');

const getCategories = asyncHandler(async (req, res) => {
  const categories = await Category.find({ owner: req.user._id }).sort({ name: 1 });
  res.json(categories);
});

const createCategory = asyncHandler(async (req, res) => {
  const { name } = req.body;
  if (!name) {
    res.status(400);
    throw new Error('Category name is required');
  }
  const category = await Category.create({ owner: req.user._id, name });
  res.status(201).json(category);
});

const updateCategory = asyncHandler(async (req, res) => {
  const category = await Category.findOne({ _id: req.params.id, owner: req.user._id });
  if (!category) {
    res.status(404);
    throw new Error('Category not found');
  }
  category.name = req.body.name ?? category.name;
  await category.save();
  res.json(category);
});

const deleteCategory = asyncHandler(async (req, res) => {
  const category = await Category.findOne({ _id: req.params.id, owner: req.user._id });
  if (!category) {
    res.status(404);
    throw new Error('Category not found');
  }
  const inUse = await Product.exists({ owner: req.user._id, category: category._id });
  if (inUse) {
    res.status(400);
    throw new Error('Cannot delete a category that has products assigned to it');
  }
  await category.deleteOne();
  res.json({ message: 'Category deleted' });
});

module.exports = { getCategories, createCategory, updateCategory, deleteCategory };
