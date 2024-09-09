const db = require('../../db/db');

const getAllAnnouncements = async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;
    const offset = (page - 1) * limit;
  
    try {
      const [announcements] = await db.query(
        'SELECT * FROM announcements WHERE Target = ? ORDER BY AnnouncementID DESC LIMIT ? OFFSET ?', 
        ['employees', limit, offset]
      );
      res.status(200).json(announcements);
    } catch (error) {
      console.error('Error fetching announcements:', error);
      res.status(500).json({ error: 'Failed to fetch announcements' });
    }
};

const StudentAnnouncements = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 5;
  const offset = (page - 1) * limit;

  try {
    const [announcements] = await db.query(
      'SELECT * FROM announcements WHERE Target = ? ORDER BY AnnouncementID DESC LIMIT ? OFFSET ?', 
      ['students', limit, offset]
    );
    res.status(200).json(announcements);
  } catch (error) {
    console.error('Error fetching announcements:', error);
    res.status(500).json({ error: 'Failed to fetch announcements' });
  }
};

module.exports = {
  getAllAnnouncements,
  StudentAnnouncements
};
