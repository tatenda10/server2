const db = require('../../db/db');

const addTimetable = async (req, res) => {
  const { classID, timetableEntries } = req.body;

  if (!classID || !timetableEntries || !Array.isArray(timetableEntries) || timetableEntries.length === 0) {
    return res.status(400).json({ error: 'Class ID and timetable entries are required' });
  }

  try {
    const insertTimetableQuery = 'INSERT INTO timetables (ClassID, Item, StartTime, EndTime, Day) VALUES ?';
    const timetableData = timetableEntries.map(entry => [
      classID,
      entry.item,
      entry.startTime,
      entry.endTime,
      entry.day
    ]);

    await db.query(insertTimetableQuery, [timetableData]);

    res.status(201).json({ message: 'Timetable added successfully' });
  } catch (error) {
    console.error('Error adding timetable:', error);
    res.status(500).json({ error: 'Failed to add timetable' });
  }
};

const getTimetable = async (req, res) => {
    const { classID } = req.params;
  
    if (!classID) {
      return res.status(400).json({ error: 'Class ID is required' });
    }
  
    try {
      const [timetables] = await db.query(
        'SELECT * FROM timetables WHERE ClassID = ? ORDER BY FIELD(Day, "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"), StartTime',
        [classID]
      );
  
      const organizedTimetable = timetables.reduce((acc, timetable) => {
        const { Day, Item, StartTime, EndTime } = timetable;
        if (!acc[Day]) {
          acc[Day] = [];
        }
        acc[Day].push({ Item, StartTime, EndTime });
        return acc;
      }, {});
  
      res.status(200).json(organizedTimetable);
    } catch (error) {
      console.error('Error fetching timetables:', error);
      res.status(500).json({ error: 'Failed to fetch timetables' });
    }
  };

module.exports = {
  addTimetable,
  getTimetable
};
