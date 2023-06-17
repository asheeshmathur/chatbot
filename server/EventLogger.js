// Import History
const IntentHistoryItem = require("./IntentHistoryItem.js");
// Stack
const IntentHistoryStack = require("./IntentHistoryStack.js");
class EventLogger {

    //Constructor - Accepts the JSON file name representing corpus
    constructor(s) {
        if (EventLogger.instance instanceof EventLogger) {
            //Return a prebuilt instance
            return EventLogger.instance;
        } else {

            this.map = new Map();
            EventLogger.instance = this;
        }
    }

    addItem(socket, item) {
        let stack = ""
        if (socket != null && item != null) {
            if (this.map.has(socket)) {
                stack = this.map.get(socket);
                stack = new IntentHistoryStack();
                stack.push(item);
                this.map.set(socket, stack);
            } else {
                stack = new IntentHistoryStack();
                stack.push(item);
                this.map.set(socket, stack);

            }
        }
    }
} // End Event Logger Class
module.exports = EventLogger;
