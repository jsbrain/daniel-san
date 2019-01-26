const { isUndefinedOrNull } = require('../utility/validation');
const { decimalFormatterStandard } = require('../utility/formatting');
const {
    findCriticalSnapshots,
    findRulesToRetire,
    findEventsWithProperty,
    findEventsByPropertyKeyAndValues,
    findEventsWithPropertyKeyContainingSubstring
} = require('../analytics');

const {
    DATE_FORMAT_STRING,
    ONCE,
    DAILY,
    WEEKLY,
    MONTHLY,
    ANNUALLY,
    STANDARD_TERMINAL_OUTPUT,
    VERBOSE,
    CONCISE,
    BUILD_DATE_STRING,
    NOT_AVAILABLE,
    STANDARD_TERMINAL_OUTPUT_PLUS_RULES_TO_RETIRE,
    DISPLAY_EVENTS_BY_GROUPS,
    DISPLAY_EVENTS_BY_NAMES,
    DISPLAY_EVENTS_BY_TYPES,
    DISPLAY_EVENTS,
    DISPLAY_CRITICAL_SNAPSHOTS,
    DISPLAY_IMPORTANT_EVENTS,
    DISPLAY_TIME_EVENTS,
    DISPLAY_ROUTINE_EVENTS,
    DISPLAY_REMINDER_EVENTS
} = require('../constants');

const TERMINAL_BOUNDARY_LIMIT = 89;

const formattingFunctionDefault = decimalFormatterStandard;
const minIntegerDigitsDefault = 1;
const minDecimalDigitsDefault = 2;
const maxDecimalDigitsDefault = 2;
const localeDefault = 'en-US';
const styleDefault = 'currency';
const currencyDefault = 'USD';

const rightPadToBoundary = ({ leftSideOfHeading, character }) => {
    let rightSideOfHeading = '';
    const length =
        TERMINAL_BOUNDARY_LIMIT - leftSideOfHeading.length < 0 ? 0 : TERMINAL_BOUNDARY_LIMIT - leftSideOfHeading.length;
    for (let looper = 0; looper < length; looper++) {
        rightSideOfHeading = `${rightSideOfHeading}${character}`;
    }
    const fullLineHeading = rightSideOfHeading ? `${leftSideOfHeading}${rightSideOfHeading}` : leftSideOfHeading;
    return fullLineHeading;
};

const terminalBoundary = (loops = 1) => {
    for (let looper = 0; looper < loops; looper++) {
        const leftSideOfHeading = '';
        const fullHeading = rightPadToBoundary({ leftSideOfHeading, character: '*' });
        console.log(fullHeading);
    }
};

const lineHeading = (heading) => {
    const leftSideOfHeading = `********${heading}`;
    const fullLineHeading = rightPadToBoundary({ leftSideOfHeading, character: '*' });
    console.log(fullLineHeading);
};

const lineSeparator = (loops = 1) => {
    for (let looper = 0; looper < loops; looper++) {
        const leftSideOfHeading = '';
        const fullHeading = rightPadToBoundary({ leftSideOfHeading, character: '-' });
        console.log(fullHeading);
    }
};

const showNothingToDisplay = () => {
    lineHeading(` nothing to display `);
    lineSeparator(2);
};

const getDefaultParamsForDecimalFormatter = (terminalOptions) => {
    const formattingFunction =
        terminalOptions.formatting && terminalOptions.formattingFunction
            ? terminalOptions.formattingFunction
            : formattingFunctionDefault;
    const minIntegerDigits =
        terminalOptions.formatting && terminalOptions.formatting.minIntegerDigits
            ? terminalOptions.formatting.minIntegerDigits
            : minIntegerDigitsDefault; // TODO: break this out and also in standardTerminalSubheader
    const minDecimalDigits =
        terminalOptions.formatting && terminalOptions.formatting.minDecimalDigits
            ? terminalOptions.formatting.minDecimalDigits
            : minDecimalDigitsDefault; // add these options in documentation
    const maxDecimalDigits =
        terminalOptions.formatting && terminalOptions.formatting.maxDecimalDigits
            ? terminalOptions.formatting.maxDecimalDigits
            : maxDecimalDigitsDefault;
    const locale =
        terminalOptions.formatting && terminalOptions.formatting.locale
            ? terminalOptions.formatting.locale
            : localeDefault;
    const style =
        terminalOptions.formatting && terminalOptions.formatting.style
            ? terminalOptions.formatting.style
            : styleDefault;
    const currency =
        terminalOptions.formatting && terminalOptions.formatting.currency
            ? terminalOptions.formatting.currency
            : currencyDefault;
    return {
        formattingFunction,
        minIntegerDigits,
        minDecimalDigits,
        maxDecimalDigits,
        locale,
        style,
        currency
    };
};

const conciseOutput = ({ event, terminalOptions }) => {
    const {
        formattingFunction,
        minIntegerDigits,
        minDecimalDigits,
        maxDecimalDigits,
        locale,
        style,
        currency
    } = getDefaultParamsForDecimalFormatter(terminalOptions);
    lineSeparator(1);
    if (event.name) console.log(`name: `, event.name);
    if (event.group) console.log(`name: `, event.group);
    if (event.amount) {
        console.log(
            `amount: `,
            formattingFunction(event.amount, {
                minIntegerDigits,
                minDecimalDigits,
                maxDecimalDigits,
                locale,
                style,
                currency
            })
        );
    }
    console.log(
        `endBalance: `,
        formattingFunction(event.endBalance, {
            minIntegerDigits,
            minDecimalDigits,
            maxDecimalDigits,
            locale,
            style,
            currency
        })
    );
    console.log(`thisDate: `, event.thisDate);
    if (event.timeStart) console.log(`timeStart: `, event.timeStart);
    if (event.notes) console.log(`notes: `, event.notes);
    lineSeparator(1);
};

const verboseOutput = (event) => {
    console.log(event);
};

const eventsLogger = ({ events, terminalOptions }) => {
    switch (terminalOptions.mode) {
        case VERBOSE:
            events.forEach((event) => {
                verboseOutput(event);
            });
            break;
        case CONCISE:
            events.forEach((event) => {
                conciseOutput({ event, terminalOptions });
            });
            break;
        default:
            break;
    }
};

const standardTerminalHeader = ({ terminalOptions }) => {
    terminalBoundary(5);
    lineHeading(' must find balance, daniel-san ');
    lineHeading(` terminal type: ${terminalOptions.type} `);
    lineHeading(` mode: ${terminalOptions.mode} `);
    lineSeparator(2);
};

const standardTerminalSubheader = ({ danielSan, terminalOptions }) => {
    const {
        formattingFunction,
        minIntegerDigits,
        minDecimalDigits,
        maxDecimalDigits,
        locale,
        style,
        currency
    } = getDefaultParamsForDecimalFormatter(terminalOptions);
    lineHeading(
        ` beginBalance: ${formattingFunction(danielSan.beginBalance, {
            minIntegerDigits,
            minDecimalDigits,
            maxDecimalDigits,
            locale,
            style,
            currency
        })} `
    );
    lineHeading(` dateStart: ${danielSan.dateStart} `);
    lineHeading(` dateEnd:   ${danielSan.dateEnd} `);
    lineSeparator(2);
};

const showCriticalSnapshots = ({ danielSan, terminalOptions }) => {
    const criticalSnapshots = findCriticalSnapshots({ danielSan, terminalOptions });
    if (criticalSnapshots) {
        terminalBoundary(3);
        lineHeading(' begin critical snapshots ');
        if (terminalOptions.criticalThreshold) {
            lineHeading(` critical threshold: < ${terminalOptions.criticalThreshold} `);
        }
        lineSeparator(2);
        eventsLogger({ events: criticalSnapshots, terminalOptions });
        lineSeparator(2);
        lineHeading(' end critical snapshots ');
        lineSeparator(2);
    }
};

const showRulesToRetire = ({ danielSan, terminalOptions }) => {
    const rulesToRetire = findRulesToRetire({ danielSan });
    if (rulesToRetire) {
        terminalBoundary(3);
        lineHeading(' begin rules to retire ');
        lineHeading(' the following rules have obsolete dateEnd values ');
        lineSeparator(2);
        eventsLogger({ events: rulesToRetire, terminalOptions });
        lineSeparator(2);
        lineHeading(' end rules to retire ');
        lineSeparator(2);
    }
};

const displayCriticalThresholdEvents = ({ danielSan, terminalOptions }) => {
    standardTerminalHeader({ terminalOptions });
    standardTerminalSubheader({ danielSan, terminalOptions });
    showCriticalSnapshots({ danielSan, terminalOptions });
    terminalBoundary(5);
};

const standardTerminalOutput = ({ danielSan, terminalOptions }) => {
    standardTerminalHeader({ terminalOptions });
    standardTerminalSubheader({ danielSan, terminalOptions });
    lineHeading(' begin events/routines/reminders ');
    lineSeparator(2);
    const relevantEvents = danielSan.events;
    if (relevantEvents) {
        eventsLogger({ events: relevantEvents, terminalOptions });
    } else {
        showNothingToDisplay();
    }
    lineSeparator(2);
    lineHeading(' end events/routines/reminders ');
    lineSeparator(2);
    if (terminalOptions.type !== DISPLAY_EVENTS) {
        showCriticalSnapshots({ danielSan, terminalOptions });
        if (terminalOptions.type === STANDARD_TERMINAL_OUTPUT_PLUS_RULES_TO_RETIRE) {
            showRulesToRetire({ danielSan, terminalOptions });
        }
    }
    terminalBoundary(5);
};

const displayEventsWithProperty = ({
    danielSan,
    terminalOptions,
    propertyKey,
    findFunction = findEventsWithProperty
}) => {
    standardTerminalHeader({ terminalOptions });
    standardTerminalSubheader({ danielSan, terminalOptions });
    lineHeading(' begin events/routines/reminders ');
    lineSeparator(2);
    const relevantEvents = findFunction({ events: danielSan.events, propertyKey });
    if (relevantEvents) {
        eventsLogger({ events: relevantEvents, terminalOptions });
    } else {
        showNothingToDisplay();
    }
    lineSeparator(2);
    terminalBoundary(5);
};

const displayEventsByPropertyKeyAndValues = ({
    danielSan,
    terminalOptions,
    propertyKey,
    findFunction = findEventsByPropertyKeyAndValues
}) => {
    standardTerminalHeader({ terminalOptions });
    standardTerminalSubheader({ danielSan, terminalOptions });
    lineHeading(' begin events/routines/reminders ');
    lineSeparator(2);
    const { searchValues } = terminalOptions;
    const relevantEvents = findFunction({ events: danielSan.events, propertyKey, searchValues });
    if (relevantEvents) {
        eventsLogger({ events: relevantEvents, terminalOptions });
    } else {
        showNothingToDisplay();
    }
    lineSeparator(2);
    terminalBoundary(5);
};

const displayEventsWithPropertyKeyContainingSubstring = ({
    danielSan,
    terminalOptions,
    propertyKey,
    substring,
    findFunction = findEventsWithPropertyKeyContainingSubstring
}) => {
    standardTerminalHeader({ terminalOptions });
    standardTerminalSubheader({ danielSan, terminalOptions });
    lineHeading(' begin events/routines/reminders ');
    lineSeparator(2);
    const relevantEvents = findFunction({ events: danielSan.events, propertyKey, substring });
    if (relevantEvents) {
        eventsLogger({ events: relevantEvents, terminalOptions });
    } else {
        showNothingToDisplay();
    }
    lineSeparator(2);
    terminalBoundary(5);
};

const terminal = ({ danielSan, terminalOptions = {}, error }) => {
    if (error) {
        console.log(error);
    } else if (danielSan) {
        try {
            if (!terminalOptions) terminalOptions = { type: STANDARD_TERMINAL_OUTPUT, mode: CONCISE };
            // eslint-disable-next-line no-lonely-if
            if (!terminalOptions.mode) terminalOptions.mode = CONCISE;
            // eslint-disable-next-line no-lonely-if
            if (!terminalOptions.type) terminalOptions.type = STANDARD_TERMINAL_OUTPUT;
            switch (terminalOptions.type) {
                case DISPLAY_EVENTS:
                case STANDARD_TERMINAL_OUTPUT:
                case STANDARD_TERMINAL_OUTPUT_PLUS_RULES_TO_RETIRE:
                    standardTerminalOutput({ danielSan, terminalOptions });
                    break;
                case DISPLAY_EVENTS_BY_GROUPS:
                    displayEventsByPropertyKeyAndValues({
                        danielSan,
                        terminalOptions,
                        propertyKey: 'group'
                    });
                    break;
                case DISPLAY_EVENTS_BY_NAMES:
                    displayEventsByPropertyKeyAndValues({
                        danielSan,
                        terminalOptions,
                        propertyKey: 'name'
                    });
                    break;
                case DISPLAY_EVENTS_BY_TYPES:
                    displayEventsByPropertyKeyAndValues({
                        danielSan,
                        terminalOptions,
                        propertyKey: 'type'
                    });
                    break;
                case DISPLAY_CRITICAL_SNAPSHOTS:
                    displayCriticalThresholdEvents({ danielSan, terminalOptions });
                    break;
                case DISPLAY_IMPORTANT_EVENTS:
                    displayEventsWithProperty({
                        danielSan,
                        terminalOptions,
                        propertyKey: 'important'
                    });
                    break;
                case DISPLAY_TIME_EVENTS:
                    displayEventsWithProperty({
                        danielSan,
                        terminalOptions,
                        propertyKey: 'timeStart'
                    });
                    break;
                case DISPLAY_ROUTINE_EVENTS:
                    displayEventsWithPropertyKeyContainingSubstring({
                        danielSan,
                        terminalOptions,
                        propertyKey: 'type',
                        substring: 'ROUTINE'
                    });
                    break;
                case DISPLAY_REMINDER_EVENTS:
                    displayEventsWithPropertyKeyContainingSubstring({
                        danielSan,
                        terminalOptions,
                        propertyKey: 'type',
                        substring: 'REMINDER'
                    });
                    break;
                default:
                    break;
            }
        } catch (err) {
            console.log(err);
        }
    }
};

module.exports = terminal;
