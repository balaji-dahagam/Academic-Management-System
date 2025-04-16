const mongoose = require('mongoose');

const ElectiveSchema = new mongoose.Schema({
  subjectCode: {
    type: String,
    required: true,
    unique: true,
  },
  subjectName: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ['hs', 'cs', 'ec'],
    required: true,
  },
  students: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
  }],
  faculty: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Faculty',
    required: true,
  }
}, { timestamps: true });

module.exports = mongoose.model('Elective', ElectiveSchema);
