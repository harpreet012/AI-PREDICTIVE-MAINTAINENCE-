/**
 * Request Validation Middleware
 * Centralized validation using express-validator
 */

const { body, param, query, validationResult } = require('express-validator');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array(),
    });
  }
  next();
};

// Common validation rules
const validationRules = {
  equipment: {
    create: [
      body('name').trim().notEmpty().withMessage('Name is required'),
      body('type').isIn(['Compressor', 'Pump', 'Motor', 'Turbine', 'Generator', 'Conveyor', 'CNC Machine', 'Boiler']).withMessage('Invalid equipment type'),
      body('location').trim().notEmpty().withMessage('Location is required'),
      validate,
    ],
    update: [
      body('name').optional().trim().notEmpty(),
      body('type').optional().isIn(['Compressor', 'Pump', 'Motor', 'Turbine', 'Generator', 'Conveyor', 'CNC Machine', 'Boiler']),
      body('location').optional().trim().notEmpty(),
      validate,
    ],
  },
  auth: {
    login: [
      body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
      body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
      validate,
    ],
    register: [
      body('name').trim().notEmpty().withMessage('Name is required'),
      body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
      body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
      validate,
    ],
  },
  maintenance: {
    create: [
      body('equipmentId').isMongoId().withMessage('Valid equipment ID required'),
      body('type').trim().notEmpty().withMessage('Maintenance type required'),
      body('scheduledDate').isISO8601().withMessage('Valid date required'),
      validate,
    ],
  },
};

module.exports = { validate, validationRules, body, param, query };
