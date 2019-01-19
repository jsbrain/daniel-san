const moment = require('moment');
const errorDisc = require('../utility/errorHandling');
const { TimeStream, streamForward } = require('../timeStream');
const {
    getRelevantDateSegmentByFrequency,
    flagCashflowRuleForRetirement,
    retireCashflowRules
} = require('../standardOperations/common');
const {
    DATE_DELIMITER,
    DATE_FORMAT_STRING,
    DAILY,
    WEEKLY,
    MONTHLY,
    ANNUALLY,
    ONCE,
    EXECUTING_RULE_ADJUSTMENT,
    MODIFIED
} = require('../constants');

/*
    specialAdjustments: [
        {
            type: MOVE_THIS_PARTICULAR_PROCESS_DATE_AFTER_THESE_WEEKDAYS
            weekdays: [SATURDAY_NUM, SUNDAY_NUM]
        }
    ];

*/
const moveThisParticularProcessDateAfterTheseWeekdays = ({ cashflowRule, specialAdjustment }) => {
    let processPhase;
    try {
        const { weekdays } = specialAdjustment;
        processPhase = EXECUTING_RULE_ADJUSTMENT;
        let thisWeekday = getRelevantDateSegmentByFrequency({
            frequency: WEEKLY,
            date: moment(cashflowRule.thisDate, DATE_FORMAT_STRING)
        });
        while (weekdays.includes(thisWeekday)) {
            const looperDate = streamForward(moment(cashflowRule.thisDate, DATE_FORMAT_STRING));
            cashflowRule.thisDate = looperDate.format(DATE_FORMAT_STRING);
            thisWeekday = getRelevantDateSegmentByFrequency({
                frequency: WEEKLY,
                date: moment(cashflowRule.thisDate, DATE_FORMAT_STRING)
            });
            processPhase = MODIFIED;
        }
        return processPhase;
    } catch (err) {
        throw errorDisc(err, 'error in moveThisParticularProcessDateAfterTheseWeekdays()', {
            processPhase,
            cashflowRule,
            specialAdjustment
        });
    }
};

/*
        specialAdjustments: [
            {
                type: MOVE_THIS_PARTICULAR_PROCESS_DATE_AFTER_THESE_DATES,
                dates: ['2019-07-04', '2019-12-25'],
                weekdays: [SATURDAY_NUM, SUNDAY_NUM] // weekdays are optional
            }
        ]

*/
const moveThisParticularProcessDateAfterTheseDates = ({ cashflowRule, specialAdjustment }) => {
    let processPhase;
    try {
        const { dates } = specialAdjustment;
        processPhase = EXECUTING_RULE_ADJUSTMENT;
        if (specialAdjustment.dates) {
            let currentProcessDate = getRelevantDateSegmentByFrequency({
                frequency: ONCE,
                date: moment(cashflowRule.thisDate, DATE_FORMAT_STRING)
            });
            while (dates.includes(currentProcessDate)) {
                const looperDate = streamForward(moment(cashflowRule.thisDate, DATE_FORMAT_STRING));
                cashflowRule.thisDate = looperDate.format(DATE_FORMAT_STRING);
                currentProcessDate = getRelevantDateSegmentByFrequency({
                    frequency: ONCE,
                    date: moment(cashflowRule.thisDate, DATE_FORMAT_STRING)
                });
            }
        }
        if (specialAdjustment.weekdays) {
            processPhase = moveThisParticularProcessDateAfterTheseWeekdays({
                cashflowRule,
                specialAdjustment
            });
            if (processPhase === MODIFIED) {
                processPhase = moveThisParticularProcessDateAfterTheseDates({ cashflowRule, specialAdjustment });
            }
        }
        return processPhase;
    } catch (err) {
        throw errorDisc(err, 'error in moveThisParticularProcessDateAfterTheseDates()', {
            processPhase,
            cashflowRule,
            specialAdjustment
        });
    }
};

/*
    dates & amounts are parallel arrays
    specialAdjustments: [
        { 
            type: ADJUST_AMOUNT_ON_THESE_PARTICULAR_DATES,
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
const adjustAmountOnTheseParticularDates = ({ cashflowRule, specialAdjustment }) => {
    let processPhase = EXECUTING_RULE_ADJUSTMENT;
    try {
        specialAdjustment.dates.forEach((looperDate, looperDateIndex) => {
            if (looperDate === cashflowRule.thisDate) {
                cashflowRule.amount += specialAdjustment.amounts[looperDateIndex];
            }
            processPhase = MODIFIED;
        });
        return processPhase;
    } catch (err) {
        throw errorDisc(err, 'error in adjustAmountOnTheseParticularDates()', {
            processPhase,
            cashflowRule,
            specialAdjustment
        });
    }
};

module.exports = {
    moveThisParticularProcessDateAfterTheseWeekdays,
    moveThisParticularProcessDateAfterTheseDates,
    adjustAmountOnTheseParticularDates
};