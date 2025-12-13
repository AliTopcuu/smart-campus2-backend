const db = require('../models');
const { Department } = db;
const { Op } = db.Sequelize;

const list = async (req, res, next) => {
  try {
    const departments = await Department.findAll({
      order: [['name', 'ASC']],
      attributes: ['id', 'name', 'code', 'faculty']
    });
    res.json(departments);
  } catch (error) {
    next(error);
  }
};

const create = async (req, res, next) => {
  try {
    const { name, code, faculty } = req.body;

    // Validate required fields
    if (!name || !code || !faculty) {
      return res.status(400).json({ message: 'Name, code, and faculty are required' });
    }

    // Check if code already exists
    const existing = await Department.findOne({ where: { code } });
    if (existing) {
      return res.status(400).json({ message: 'Department code already exists' });
    }

    const department = await Department.create({
      name,
      code,
      faculty
    });

    res.status(201).json({
      message: 'Department created successfully',
      department
    });
  } catch (error) {
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, code, faculty } = req.body;

    const department = await Department.findByPk(id);
    if (!department) {
      return res.status(404).json({ message: 'Department not found' });
    }

    // Check if code already exists (excluding current department)
    if (code && code !== department.code) {
      const existing = await Department.findOne({ 
        where: { 
          code,
          id: { [Op.ne]: id }
        } 
      });
      if (existing) {
        return res.status(400).json({ message: 'Department code already exists' });
      }
    }

    await department.update({
      name: name || department.name,
      code: code || department.code,
      faculty: faculty || department.faculty
    });

    res.json({
      message: 'Department updated successfully',
      department
    });
  } catch (error) {
    next(error);
  }
};

const remove = async (req, res, next) => {
  try {
    const { id } = req.params;

    const department = await Department.findByPk(id);
    if (!department) {
      return res.status(404).json({ message: 'Department not found' });
    }

    await department.destroy();

    res.json({ message: 'Department deleted successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  list,
  create,
  update,
  remove
};
