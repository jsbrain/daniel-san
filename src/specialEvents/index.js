const { errorDisc } = require('../utility/errorHandling');
const { isUndefinedOrNull } = require('../utility/validation');
const { createTimeZone } = require('../timeZone');
const { streamForward } = require('../timeStream');
const { generateEvent } = require('../core/eventGeneration');
const { exclusionsPhase } = require('../core/obliterate');
const { getRelevantDateSegmentByFrequency } = require('../core/dateUtility');
const {
    EVALUATING_RULE_INSERTION,
    EXECUTING_RULE_INSERTION,
    EXECUTION_REJECTED,
    DATE_FORMAT_STRING,
    WEEKLY,
    MONTHLY,
    SUNDAY,
    MONDAY,
    TUESDAY,
    WEDNESDAY,
    THURSDAY,
    FRIDAY,
    SATURDAY
} = require('../constants');

/*
    0 = Sunday
    6 = Saturday
*/
const findAllWeekdaysInTheMonth = ({ date, timeZone, timeZoneType }) => {
    try {
        const monthlyWeekdayConstruct = {
            0: [],
            1: [],
            2: [],
            3: [],
            4: [],
            5: [],
            6: []
        };
        const startOfMonth = createTimeZone({ timeZone, timeZoneType, date }).startOf('month');
        const endOfMonth = createTimeZone({ timeZone, timeZoneType, date }).endOf('month');

        const processThisLooperDate = (thisLooperDate) => {
            try {
                const thisWeekday = getRelevantDateSegmentByFrequency({
                    frequency: WEEKLY,
                    date: thisLooperDate
                });
                switch (thisWeekday) {
                case SUNDAY:
                    monthlyWeekdayConstruct[SUNDAY].push(thisLooperDate.format(DATE_FORMAT_STRING));
                    break;
                case MONDAY:
                    monthlyWeekdayConstruct[MONDAY].push(thisLooperDate.format(DATE_FORMAT_STRING));
                    break;
                case TUESDAY:
                    monthlyWeekdayConstruct[TUESDAY].push(thisLooperDate.format(DATE_FORMAT_STRING));
                    break;
                case WEDNESDAY:
                    monthlyWeekdayConstruct[WEDNESDAY].push(thisLooperDate.format(DATE_FORMAT_STRING));
                    break;
                case THURSDAY:
                    monthlyWeekdayConstruct[THURSDAY].push(thisLooperDate.format(DATE_FORMAT_STRING));
                    break;
                case FRIDAY:
                    monthlyWeekdayConstruct[FRIDAY].push(thisLooperDate.format(DATE_FORMAT_STRING));
                    break;
                case SATURDAY:
                    monthlyWeekdayConstruct[SATURDAY].push(thisLooperDate.format(DATE_FORMAT_STRING));
                    break;
                default:
                    break;
                }
            } catch (err) {
                throw errorDisc({ err, data: { thisLooperDate } });
            }
        };

        let looperDate = startOfMonth;
        do {
            processThisLooperDate(looperDate);
            looperDate = streamForward(looperDate);
        } while (looperDate.format(DATE_FORMAT_STRING) !== endOfMonth.format(DATE_FORMAT_STRING));
        processThisLooperDate(looperDate); // post execution for the last day of the month
        return monthlyWeekdayConstruct;
    } catch (err) {
        throw errorDisc({ err, data: { date, timeZone, timeZoneType } });
    }
};

/*
    frequency = [
        { nthId: 1, weekday: FRIDAY },
        { nthId: 3, weekday: FRIDAY }
        { nthId: -1, weekday: SUNDAY } // a negative nthId means the last occurence of the month
    ];

*/
const nthWeekdaysOfMonth = ({ danielSan, rule, date, skipTimeTravel }) => {
    let processPhase = EVALUATING_RULE_INSERTION;
    let nthProcessDayTracker;
    let looperDateTracker;
    let looperDateIndexTracker;
    try {
        const nthProcessDays = rule.frequency;
        const weekdaysInMonth = findAllWeekdaysInTheMonth({ date, timeZone: rule.timeZone, timeZoneType: rule.timeZoneType });
        nthProcessDays.forEach((nthProcessDay) => {
            nthProcessDayTracker = nthProcessDay;
            const objectKey = nthProcessDay.weekday;
            const sizeOfObjectKeyArray = weekdaysInMonth[objectKey].length;
            weekdaysInMonth[objectKey].forEach((looperDate, looperDateIndex) => {
                looperDateTracker = looperDate;
                looperDateIndexTracker = looperDateIndex;
                processPhase = EVALUATING_RULE_INSERTION;
                if (
                    date.format(DATE_FORMAT_STRING) === looperDate &&
                    (nthProcessDay.nthId === looperDateIndex + 1 ||
                        nthProcessDay.nthId === 0 ||
                        (nthProcessDay.nthId < 0 && looperDateIndex === sizeOfObjectKeyArray - 1))
                ) {
                    processPhase = EXECUTING_RULE_INSERTION;
                    processPhase = exclusionsPhase({ rule, date, processPhase, danielSan });
                    if (processPhase !== EXECUTION_REJECTED) {
                        processPhase = generateEvent({ danielSan, rule, date, skipTimeTravel });
                    }
                }
            });
        });
        return processPhase;
    } catch (err) {
        throw errorDisc({ err, data: { rule, date, processPhase, nthProcessDayTracker, looperDateTracker, looperDateIndexTracker } });
    }
};

/*
    frequency: FRIDAY,
    processDate: '13',

*/
const weekdayOnDate = ({ danielSan, rule, date, skipTimeTravel }) => {
    let processPhase = EVALUATING_RULE_INSERTION;
    try {
        const thisProcessDate = getRelevantDateSegmentByFrequency({
            frequency: MONTHLY,
            date
        });
        const thisWeekday = getRelevantDateSegmentByFrequency({
            frequency: WEEKLY,
            date
        });
        // this block ensures backward compatibility when frequency was used for the weekday
        if(!isUndefinedOrNull(rule.weekday)){
            rule.frequency = rule.weekday;
        }
        if (rule.processDate === thisProcessDate && rule.frequency === thisWeekday) {
            processPhase = EXECUTING_RULE_INSERTION;
            processPhase = exclusionsPhase({ rule, date, processPhase, danielSan });
            if (processPhase !== EXECUTION_REJECTED) {
                processPhase = generateEvent({ danielSan, rule, date, skipTimeTravel });
            }
        }
        return processPhase;
    } catch (err) {
        throw errorDisc({ err, data: { rule, date, processPhase } });
    }
};

module.exports = { nthWeekdaysOfMonth, weekdayOnDate };
