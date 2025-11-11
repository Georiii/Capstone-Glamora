const express = require('express');
const Policy = require('../models/Policy');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    await Policy.ensureDefaults();

    const policies = await Policy.find({})
      .populate('updatedBy', 'name email')
      .lean();

    const response = {};
    policies.forEach((policy) => {
      response[policy.key] = {
        key: policy.key,
        title: policy.title,
        content: policy.content,
        updatedAt: policy.updatedAt,
        updatedBy: policy.updatedBy
          ? {
              id: policy.updatedBy._id,
              name: policy.updatedBy.name,
              email: policy.updatedBy.email,
            }
          : null,
      };
    });

    res.set({
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      Pragma: 'no-cache',
      Expires: '0',
    });

    res.json({ policies: response });
  } catch (error) {
    console.error('Failed to load policies:', error);
    res.status(500).json({ message: 'Failed to load policies', error: error.message });
  }
});

module.exports = router;

