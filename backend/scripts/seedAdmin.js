const User = require('../models/User');

const ADMIN_EMAIL = 'admin@secops.com';
const ADMIN_PASSWORD = 'S3c!9xK2';

const seedAdmin = async () => {
  try {
    let admin = await User.findOne({
      email: { $in: [ADMIN_EMAIL, 'admin@pavo.com'] }
    });

    if (!admin) {
      await User.create({
        name: 'System Admin',
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        isAdmin: true,
        isVerified: true
      });
      console.log(`✅ Default Admin created: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
    } else {
      admin.email = ADMIN_EMAIL;
      admin.password = ADMIN_PASSWORD;
      admin.isAdmin = true;
      admin.isVerified = true;
      await admin.save();
      console.log(`✅ Default Admin updated: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
    }
  } catch (error) {
    console.error('❌ Error seeding admin:', error.message);
  }
};

module.exports = seedAdmin;
