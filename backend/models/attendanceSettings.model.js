const mongoose = require('mongoose');

const employeeAttendanceSettingsSchema = new mongoose.Schema(
  {
    assignedHostel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hostel',
      required: true,
      unique: true,
    },

    // Working hours configuration
    workingHoursPerDay: {
      type: Number,
      default: 8,
      min: 1,
      max: 24,
    },
    halfDayThreshold: {
      type: Number,
      default: 4,
      min: 1,
      max: 12,
    },

    // Timing rules
    checkInTime: {
      type: String,
      default: '09:00',
      match: /^([01]\d|2[0-3]):([0-5]\d)$/,
    },
    checkOutTime: {
      type: String,
      default: '18:00',
      match: /^([01]\d|2[0-3]):([0-5]\d)$/,
    },
    lateThreshold: {
      type: Number,
      default: 15, // Minutes after check-in time
      min: 0,
    },
    earlyLeaveThreshold: {
      type: Number,
      default: 30, // Minutes before check-out time
      min: 0,
    },

    // Weekend configuration
    weekendDays: {
      type: [String],
      default: ['Sunday'],
      enum: [
        'Monday',
        'Tuesday',
        'Wednesday',
        'Thursday',
        'Friday',
        'Saturday',
        'Sunday',
      ],
    },

    // Auto-mark configuration
    autoMarkEnabled: {
      type: Boolean,
      default: true,
    },
    autoMarkTime: {
      type: String,
      default: '23:59',
      match: /^([01]\d|2[0-3]):([0-5]\d)$/,
    },

    // Salary calculation rules
    deductFullDayForAbsent: {
      type: Boolean,
      default: true,
    },
    deductHalfDayAmount: {
      type: Boolean,
      default: true,
    },
    includeWeekendsInCalculation: {
      type: Boolean,
      default: false,
    },

    // Overtime settings
    overtimeEnabled: {
      type: Boolean,
      default: false,
    },
    overtimeThreshold: {
      type: Number,
      default: 8, // Hours per day
      min: 1,
    },
    overtimeRate: {
      type: Number,
      default: 1.5, // 1.5x multiplier
      min: 1,
    },

    // Holidays
    holidays: [
      {
        date: {
          type: String, // "YYYY-MM-DD"
          required: true,
        },
        name: {
          type: String,
          required: true,
        },
        isPaid: {
          type: Boolean,
          default: true,
        },
      },
    ],

    // Last auto-mark run info
    lastRunInfo: {
      lastRunDate: String,
      lastRunTime: Date,
      employeesProcessed: Number,
      markedPresent: Number,
      markedAbsent: Number,
      markedOnLeave: Number,
      errors: Number,
    },
  },
  {
    timestamps: true,
  }
);

// Method: Check if time is late
employeeAttendanceSettingsSchema.methods.isLate = function (checkInTime) {
  const [hours, minutes] = this.checkInTime.split(':').map(Number);
  const configuredTime = new Date(checkInTime);
  configuredTime.setHours(hours, minutes, 0, 0);

  const thresholdTime = new Date(configuredTime);
  thresholdTime.setMinutes(thresholdTime.getMinutes() + this.lateThreshold);

  return new Date(checkInTime) > thresholdTime;
};

// Method: Check if time is early leave
employeeAttendanceSettingsSchema.methods.isEarlyLeave = function (
  checkOutTime
) {
  const [hours, minutes] = this.checkOutTime.split(':').map(Number);
  const configuredTime = new Date(checkOutTime);
  configuredTime.setHours(hours, minutes, 0, 0);

  const thresholdTime = new Date(configuredTime);
  thresholdTime.setMinutes(
    thresholdTime.getMinutes() - this.earlyLeaveThreshold
  );

  return new Date(checkOutTime) < thresholdTime;
};

// Method: Check if date is holiday
employeeAttendanceSettingsSchema.methods.isHoliday = function (date) {
  return this.holidays.some((holiday) => holiday.date === date);
};

// Method: Get holiday by date
employeeAttendanceSettingsSchema.methods.getHoliday = function (date) {
  return this.holidays.find((holiday) => holiday.date === date);
};

// Method: Check if date is weekend
employeeAttendanceSettingsSchema.methods.isWeekend = function (date) {
  const dayNames = [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
  ];
  const dayName = dayNames[new Date(date).getDay()];
  return this.weekendDays.includes(dayName);
};

// Method: Add holiday
employeeAttendanceSettingsSchema.methods.addHoliday = function (
  date,
  name,
  isPaid = true
) {
  const existingIndex = this.holidays.findIndex((h) => h.date === date);
  if (existingIndex >= 0) {
    this.holidays[existingIndex] = { date, name, isPaid };
  } else {
    this.holidays.push({ date, name, isPaid });
  }
  return this.save();
};

// Method: Remove holiday
employeeAttendanceSettingsSchema.methods.removeHoliday = function (date) {
  this.holidays = this.holidays.filter((h) => h.date !== date);
  return this.save();
};

// Method: Calculate working days in month
employeeAttendanceSettingsSchema.methods.calculateWorkingDays = function (
  year,
  month
) {
  const daysInMonth = new Date(year, month, 0).getDate();
  let workingDays = 0;

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month - 1, day);
    const dateString = date.toISOString().split('T')[0];

    const isWeekend = this.isWeekend(dateString);
    const isHoliday = this.isHoliday(dateString);

    if (!isWeekend && !isHoliday) {
      workingDays++;
    }
  }

  return workingDays;
};

// Static method: Get or create settings for hostel
employeeAttendanceSettingsSchema.statics.getOrCreateSettings = async function (
  hostelId
) {
  let settings = await this.findOne({ assignedHostel: hostelId });
  if (!settings) {
    settings = await this.create({ assignedHostel: hostelId });
  }
  return settings;
};

const EmployeeAttendanceSettings = mongoose.model(
  'EmployeeAttendanceSettings',
  employeeAttendanceSettingsSchema
);

module.exports = EmployeeAttendanceSettings;
