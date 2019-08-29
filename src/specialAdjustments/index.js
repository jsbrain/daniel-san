const moment = require('moment');
const { errorDisc } = require('../utility/errorHandling');
const { streamForward, streamBackward } = require('../timeStream');
const { createTimeZone } = require('../timeZone');
const { getRelevantDateSegmentByFrequency } = require('../standardEvents/common');
const {
    DATE_FORMAT_STRING,
    WEEKLY,
    ONCE,
    EXECUTING_RULE_ADJUSTMENT,
    MODIFIED
} = require('../constants');

/*
    specialAdjustments: [
        {
            type: MOVE_THIS_PROCESS_DATE_BEFORE_THESE_WEEKDAYS
            weekdays: [SATURDAY, SUNDAY]
        }
    ];

*/
const moveThisProcessDateBeforeTheseWeekdays = ({ event, specialAdjustment }) => {
    let processPhase;
    try {
        const { weekdays } = specialAdjustment;
        processPhase = EXECUTING_RULE_ADJUSTMENT;
        let thisWeekday = getRelevantDateSegmentByFrequency({
            frequency: WEEKLY,
            date: createTimeZone({ timeZone: event.timeZone, timeZoneType: event.timeZoneType, dateString: event.eventDate })
        });
        while (weekdays.includes(thisWeekday)) {
            const looperDate = streamBackward(createTimeZone({ timeZone: event.timeZone, timeZoneType: event.timeZoneType, dateString: event.eventDate }));
            event.eventDate = looperDate.format(DATE_FORMAT_STRING);
            thisWeekday = getRelevantDateSegmentByFrequency({
                frequency: WEEKLY,
                date: createTimeZone({ timeZone: event.timeZone, timeZoneType: event.timeZoneType, dateString: event.eventDate })
            });
            processPhase = MODIFIED;
        }
        return processPhase;
    } catch (err) {
        throw errorDisc(err, 'error in moveThisProcessDateBeforeTheseWeekdays()', {
            processPhase,
            event,
            specialAdjustment
        });
    }
};


/*
    specialAdjustments: [
        {
            type: MOVE_THIS_PROCESS_DATE_AFTER_THESE_WEEKDAYS
            weekdays: [SATURDAY, SUNDAY]
        }
    ];

*/
const moveThisProcessDateAfterTheseWeekdays = ({ event, specialAdjustment }) => {
    let processPhase;
    try {
        const { weekdays } = specialAdjustment;
        processPhase = EXECUTING_RULE_ADJUSTMENT;
        let thisWeekday = getRelevantDateSegmentByFrequency({
            frequency: WEEKLY,
            date: createTimeZone({ timeZone: event.timeZone, timeZoneType: event.timeZoneType, dateString: event.eventDate })
        });
        while (weekdays.includes(thisWeekday)) {
            const looperDate = streamForward(createTimeZone({ timeZone: event.timeZone, timeZoneType: event.timeZoneType, dateString: event.eventDate }));
            event.eventDate = looperDate.format(DATE_FORMAT_STRING);
            thisWeekday = getRelevantDateSegmentByFrequency({
                frequency: WEEKLY,
                date: createTimeZone({ timeZone: event.timeZone, timeZoneType: event.timeZoneType, dateString: event.eventDate })
            });
            processPhase = MODIFIED;
        }
        return processPhase;
    } catch (err) {
        throw errorDisc(err, 'error in moveThisProcessDateAfterTheseWeekdays()', {
            processPhase,
            event,
            specialAdjustment
        });
    }
};

/*
        specialAdjustments: [
            {
                type: MOVE_THIS_PROCESS_DATE_BEFORE_THESE_DATES,
                dates: ['2019-07-04', '2019-12-25'],
                weekdays: [SATURDAY, SUNDAY] // weekdays are optional
            }
        ]

*/
const moveThisProcessDateBeforeTheseDates = ({ event, specialAdjustment }) => {
    let processPhase;
    try {
        const { dates } = specialAdjustment;
        processPhase = EXECUTING_RULE_ADJUSTMENT;
        if (specialAdjustment.dates) {
            let currentProcessDate = getRelevantDateSegmentByFrequency({
                frequency: ONCE,
                date: createTimeZone({ timeZone: event.timeZone, timeZoneType: event.timeZoneType, dateString: event.eventDate })
            });
            while (dates.includes(currentProcessDate)) {
                const looperDate = streamBackward(createTimeZone({ timeZone: event.timeZone, timeZoneType: event.timeZoneType, dateString: event.eventDate }));
                event.eventDate = looperDate.format(DATE_FORMAT_STRING);
                currentProcessDate = getRelevantDateSegmentByFrequency({
                    frequency: ONCE,
                    date: createTimeZone({ timeZone: event.timeZone, timeZoneType: event.timeZoneType, dateString: event.eventDate })
                });
            }
        }
        if (specialAdjustment.weekdays) {
            processPhase = moveThisProcessDateBeforeTheseWeekdays({
                event,
                specialAdjustment
            });
            if (processPhase === MODIFIED) {
                processPhase = moveThisProcessDateBeforeTheseDates({ event, specialAdjustment });
            }
        }
        return processPhase;
    } catch (err) {
        throw errorDisc(err, 'error in moveThisProcessDateBeforeTheseDates()', {
            processPhase,
            event,
            specialAdjustment
        });
    }
};

/*
        specialAdjustments: [
            {
                type: MOVE_THIS_PROCESS_DATE_AFTER_THESE_DATES,
                dates: ['2019-07-04', '2019-12-25'],
                weekdays: [SATURDAY, SUNDAY] // weekdays are optional
            }
        ]

*/
const moveThisProcessDateAfterTheseDates = ({ event, specialAdjustment }) => {
    let processPhase;
    try {
        const { dates } = specialAdjustment;
        processPhase = EXECUTING_RULE_ADJUSTMENT;
        if (specialAdjustment.dates) {
            let currentProcessDate = getRelevantDateSegmentByFrequency({
                frequency: ONCE,
                date: createTimeZone({ timeZone: event.timeZone, timeZoneType: event.timeZoneType, dateString: event.eventDate })
            });
            while (dates.includes(currentProcessDate)) {
                const looperDate = streamForward(createTimeZone({ timeZone: event.timeZone, timeZoneType: event.timeZoneType, dateString: event.eventDate }));
                event.eventDate = looperDate.format(DATE_FORMAT_STRING);
                currentProcessDate = getRelevantDateSegmentByFrequency({
                    frequency: ONCE,
                    date: createTimeZone({ timeZone: event.timeZone, timeZoneType: event.timeZoneType, dateString: event.eventDate })
                });
            }
        }
        if (specialAdjustment.weekdays) {
            processPhase = moveThisProcessDateAfterTheseWeekdays({
                event,
                specialAdjustment
            });
            if (processPhase === MODIFIED) {
                processPhase = moveThisProcessDateAfterTheseDates({ event, specialAdjustment });
            }
        }
        return processPhase;
    } catch (err) {
        throw errorDisc(err, 'error in moveThisProcessDateAfterTheseDates()', {
            processPhase,
            event,
            specialAdjustment
        });
    }
};

/*
    dates & amounts are parallel arrays
    specialAdjustments: [
        { 
            type: ADJUST_AMOUNT_ON_THESE_DATES,
            dates: [
                '2019-06-01', 
                '2019-09-01'
            ],
            amounts: [
                500000,
                250000
            ]
        }
    ]
*/
const adjustAmountOnTheseDates = ({ event, specialAdjustment }) => {
    let processPhase = EXECUTING_RULE_ADJUSTMENT;
    try {
        specialAdjustment.dates.forEach((looperDate, looperDateIndex) => {
            if (looperDate === event.eventDate && event.amount) {
                event.amount += specialAdjustment.amounts[looperDateIndex];
            }
            processPhase = MODIFIED;
        });
        return processPhase;
    } catch (err) {
        throw errorDisc(err, 'error in adjustAmountOnTheseDates()', {
            processPhase,
            event,
            specialAdjustment
        });
    }
};

module.exports = {
    moveThisProcessDateAfterTheseWeekdays,
    moveThisProcessDateAfterTheseDates,
    moveThisProcessDateBeforeTheseWeekdays,
    moveThisProcessDateBeforeTheseDates,
    adjustAmountOnTheseDates
};
