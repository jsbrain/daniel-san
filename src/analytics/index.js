const { isUndefinedOrNull } = require('../utility/validation');
const { initializeTimeZoneData, createTimeZone, convertTimeZone } = require('../timeZone');
const { DATE_FORMAT_STRING, ONCE } = require('../constants');

// finds rules with end dates that are less than the beginning date range of the budget projection
const findRulesToRetire = (danielSan) => {
    const { effectiveDateStart } = danielSan;
    // eslint-disable-next-line array-callback-return
    const rulesToRetire = danielSan.rules.filter((rule, index) => {
        const dateToStartConfig = initializeTimeZoneData(danielSan);
        const dateToStart = createTimeZone({
            timeZone: dateToStartConfig.timeZone,
            timeZoneType: dateToStartConfig.timeZoneType,
            dateString: effectiveDateStart
        });
        const convertedDateToStartConfig = initializeTimeZoneData(rule);
        const convertedDateToStart = convertTimeZone({
            timeZone: convertedDateToStartConfig.timeZone,
            timeZoneType: convertedDateToStartConfig.timeZoneType,
            date: dateToStart
        }).date;
        const convertedDateStartString = convertedDateToStart.format(DATE_FORMAT_STRING);
        if (!isUndefinedOrNull(rule.effectiveDateEnd) && rule.effectiveDateEnd < convertedDateStartString) {
            rule.ruleIndex = index;
            return rule;
        } else if (
            rule.frequency === ONCE &&
            typeof rule.processDate === 'string' &&
            rule.processDate < convertedDateStartString
        ) {
            rule.ruleIndex = index;
            return rule;
        }
    });
    if (rulesToRetire.length > 0) {
        return rulesToRetire;
        // eslint-disable-next-line no-else-return
    } else {
        return null;
    }
    // eslint-disable-next-line no-unreachable
    return null; // this line satisfies another linting error
};

const findEventsWithProperty = ({ events, propertyKey }) => {
    // eslint-disable-next-line array-callback-return
    const eventsFound = events.filter((event) => {
        // eslint-disable-line consistent-return
        if (event[propertyKey]) {
            return event;
        }
    });
    if (eventsFound.length > 0) {
        return eventsFound;
        // eslint-disable-next-line no-else-return
    } else {
        return null;
    }
    // eslint-disable-next-line no-unreachable
    return null; // this line satisfies another linting error
};

const findEventsByPropertyKeyAndValues = ({ events, propertyKey, searchValues }) => {
    if (events && propertyKey && searchValues && Array.isArray(searchValues) && searchValues.length > 0) {
        const eventsFound = [];
        events.forEach((event) => {
            searchValues.forEach((searchCriteriaValue) => {
                let eventProperty = event[propertyKey];
                if (eventProperty && typeof eventProperty === 'string') {
                    eventProperty = eventProperty.toLowerCase();
                }
                const newSearchCriteriaValue =
                    typeof searchCriteriaValue === 'string' ? searchCriteriaValue.toLowerCase() : searchCriteriaValue;
                if (eventProperty && eventProperty === newSearchCriteriaValue) {
                    eventsFound.push(event);
                }
            });
        });
        if (eventsFound && eventsFound.length > 0) {
            return eventsFound;
            // eslint-disable-next-line no-else-return
        } else {
            return null;
        }
        // eslint-disable-next-line no-else-return
    } else {
        return null;
    }
};

const findEventsWithPropertyKeyContainingSubstring = ({ events, propertyKey, substring }) => {
    // eslint-disable-next-line array-callback-return
    const eventsFound = events.filter((event) => {
        // eslint-disable-line consistent-return
        if (event[propertyKey] && event[propertyKey].includes(substring)) {
            return event;
        }
    });
    if (eventsFound.length > 0) {
        return eventsFound;
        // eslint-disable-next-line no-else-return
    } else {
        return null;
    }
    // eslint-disable-next-line no-unreachable
    return null; // this line satisfies another linting error
};

const findCriticalSnapshots = ({ danielSan, criticalThreshold = 0, propertyKey = 'balanceEnding' }) => {
    let criticalSnapshots = null;
    if (!isUndefinedOrNull(criticalThreshold)) {
        criticalSnapshots = danielSan.events.filter((event) => {
            return event[propertyKey] < criticalThreshold;
        });
    }
    return criticalSnapshots;
};

const findSnapshotsGreaterThanAmount = ({ collection = [], amount = 0, propertyKey = 'balanceEnding' }) => {
    const newCollection = collection.filter((element) => {
        if (!isUndefinedOrNull(element[propertyKey]) && element[propertyKey] > amount) {
            return element;
        }
    });
    return newCollection;
};

const findSnapshotsLessThanAmount = ({ collection = [], amount = 0, propertyKey = 'balanceEnding' }) => {
    const newCollection = collection.filter((element) => {
        if (!isUndefinedOrNull(element[propertyKey]) && element[propertyKey] < amount) {
            return element;
        }
    });
    return newCollection;
};

const findGreatestValueSnapshots = ({
    collection = [],
    propertyKey = 'balanceEnding',
    selectionAmount = 7,
    reverse = false
}) => {
    let sortedCollection = collection.sort((a, b) => {
        if (a[propertyKey] > b[propertyKey]) {
            return -1;
        } else if (a[propertyKey] < b[propertyKey]) {
            return 1;
            // eslint-disable-next-line no-else-return
        } else {
            return 0;
        }
    });
    if (reverse) {
        sortedCollection = sortedCollection.reverse();
    }
    const finalCollection = sortedCollection.slice(0, selectionAmount);
    return finalCollection;
};

const sumAllPositiveEventAmounts = (danielSan) => {
    let sum = 0;
    danielSan.events.forEach((event) => {
        const { amount, amountConverted } = event;
        if (!isUndefinedOrNull(amount) && amountConverted > 0) {
            // routine/reminder types like STANDARD_EVENT_ROUTINE do not require an amount field
            // we first check to make sure it had an amount field so that it satisfies our required context
            // however, we are actually only interested in the multi-currency converted amount
            sum += amountConverted;
        }
    });
    return sum;
};

const sumAllNegativeEventAmounts = (danielSan) => {
    let sum = 0;
    danielSan.events.forEach((event) => {
        const { amount, amountConverted } = event;
        if (!isUndefinedOrNull(amount) && amountConverted < 0) {
            // routine/reminder types like STANDARD_EVENT_ROUTINE do not require an amount field
            // we first check to make sure it had an amount field so that it satisfies our required context
            // however, we are actually only interested in the multi-currency converted amount
            sum += amountConverted;
        }
    });
    return sum;
};

module.exports = {
    findSnapshotsGreaterThanAmount,
    findSnapshotsLessThanAmount,
    findCriticalSnapshots,
    findRulesToRetire,
    findEventsWithProperty,
    findEventsByPropertyKeyAndValues,
    findEventsWithPropertyKeyContainingSubstring,
    findGreatestValueSnapshots,
    sumAllPositiveEventAmounts,
    sumAllNegativeEventAmounts
};
