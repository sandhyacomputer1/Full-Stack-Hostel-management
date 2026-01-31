// backend/models/employeeAttendanceSettings.model.js
const mongoose = require("mongoose");

const employeeAttendanceSettingsSchema = new mongoose.Schema(
    {
        assignedHostel: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Hostel",
            required: true,
            unique: true,
            index: true,
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
            default: "09:00",
            validate: {
                validator: function (v) {
                    return /^([01]\d|2[0-3]):([0-5]\d)$/.test(v);
                },
                message: "Check-in time must be in HH:mm format",
            },
        },

        checkOutTime: {
            type: String,
            default: "18:00",
            validate: {
                validator: function (v) {
                    return /^([01]\d|2[0-3]):([0-5]\d)$/.test(v);
                },
                message: "Check-out time must be in HH:mm format",
            },
        },

        lateThreshold: {
            type: Number,
            default: 15,
            min: 0,
            max: 120,
        },

        earlyLeaveThreshold: {
            type: Number,
            default: 30,
            min: 0,
            max: 120,
        },

        // Auto-mark settings
        autoMarkEnabled: {
            type: Boolean,
            default: true,
        },

        autoMarkTime: {
            type: String,
            default: "23:59",
            validate: {
                validator: function (v) {
                    return /^([01]\d|2[0-3]):([0-5]\d)$/.test(v);
                },
                message: "Auto-mark time must be in HH:mm format",
            },
        },

        stateBasedPresentAbsent: {
            type: Boolean,
            default: true,
        },

        // Salary calculation settings
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

        countSundaysAsWorkingDays: {
            type: Boolean,
            default: false,
        },

        // Holidays
        holidays: [
            {
                date: {
                    type: String,
                    required: true,
                    validate: {
                        validator: function (v) {
                            return /^\d{4}-\d{2}-\d{2}$/.test(v);
                        },
                        message: "Holiday date must be in YYYY-MM-DD format",
                    },
                },
                name: {
                    type: String,
                    required: true,
                    trim: true,
                },
                isPaid: {
                    type: Boolean,
                    default: true,
                },
            },
        ],

        // Last run information
        lastRunInfo: {
            date: String,
            present: Number,
            absent: Number,
            halfDay: Number,
            leave: Number,
            ranAt: Date,
        },

        // Overtime settings
        overtimeEnabled: {
            type: Boolean,
            default: false,
        },

        overtimeThreshold: {
            type: Number,
            default: 8,
            min: 1,
        },

        overtimeRate: {
            type: Number,
            default: 1.5,
            min: 1,
        },
    },
    {
        timestamps: true,
    }
);

// METHODS
employeeAttendanceSettingsSchema.methods.isHoliday = function (date) {
    return this.holidays.some((h) => h.date === date);
};

employeeAttendanceSettingsSchema.methods.getHoliday = function (date) {
    return this.holidays.find((h) => h.date === date);
};

employeeAttendanceSettingsSchema.methods.addHoliday = function (
    date,
    name,
    isPaid = true
) {
    // Check if holiday already exists
    const exists = this.holidays.some((h) => h.date === date);
    if (!exists) {
        this.holidays.push({ date, name, isPaid });
    }
    return this;
};

employeeAttendanceSettingsSchema.methods.removeHoliday = function (date) {
    this.holidays = this.holidays.filter((h) => h.date !== date);
    return this;
};

employeeAttendanceSettingsSchema.methods.isLate = function (checkInTime) {
    const [expectedHour, expectedMin] = this.checkInTime.split(":").map(Number);
    const actualTime = new Date(checkInTime);
    const actualHour = actualTime.getHours();
    const actualMin = actualTime.getMinutes();

    const expectedMinutes = expectedHour * 60 + expectedMin;
    const actualMinutes = actualHour * 60 + actualMin;

    return actualMinutes > expectedMinutes + this.lateThreshold;
};

employeeAttendanceSettingsSchema.methods.isEarlyLeave = function (
    checkOutTime
) {
    const [expectedHour, expectedMin] = this.checkOutTime.split(":").map(Number);
    const actualTime = new Date(checkOutTime);
    const actualHour = actualTime.getHours();
    const actualMin = actualTime.getMinutes();

    const expectedMinutes = expectedHour * 60 + expectedMin;
    const actualMinutes = actualHour * 60 + actualMin;

    return actualMinutes < expectedMinutes - this.earlyLeaveThreshold;
};

// JSON OUTPUT
employeeAttendanceSettingsSchema.set("toJSON", {
    virtuals: true,
    transform: function (doc, ret) {
        delete ret.__v;
        return ret;
    },
});

module.exports = mongoose.models.EmployeeAttendanceSettings || mongoose.model(
    "EmployeeAttendanceSettings",
    employeeAttendanceSettingsSchema
);
