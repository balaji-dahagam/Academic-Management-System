// models/NoInstructionDay.js
const mongoose = require('mongoose');

const noInstructionDaySchema = new mongoose.Schema({
  date: { 
    type: String, 
    required: true, 
    unique: true,
    validate: {
      validator: function(v) {
        // Validate YYYY-MM-DD format using regex
        return /^\d{4}-\d{2}-\d{2}$/.test(v) && !isNaN(new Date(v).getTime());
      },
      message: props => `${props.value} is not a valid date in YYYY-MM-DD format`
    }
  },
  reason: { 
    type: String, 
    required: true,
    enum: ['HOLIDAY', 'FESTIVAL', 'MID_SEM_EXAM', 'END_SEM_EXAM', 'OTHER'] 
  },
  description: String,
  academicYear: { 
    type: String, 
    required: true,
    validate: {
      validator: function(v) {
        // Validate academic year format (e.g., 2023-2024)
        return /^\d{4}-\d{4}$/.test(v);
      },
      message: props => `${props.value} is not a valid academic year format (e.g., 2023-2024)`
    }
  }
});

// Add index for frequently queried fields
noInstructionDaySchema.index({ date: 1 });
noInstructionDaySchema.index({ academicYear: 1 });

module.exports = mongoose.model('NoInstructionDay', noInstructionDaySchema);