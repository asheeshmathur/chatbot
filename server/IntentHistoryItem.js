class IntentHistoryItem {
    constructor(message,intent, response) {
        this.message= message;
        this.intent = intent;
        this.response = response;
    }
    // Getter & Setter for Intent
    getIntent() {
        return this.intent;
    }
    setIntent(newIntent) {
        newIntent = newIntent.trim();
        if (newIntent === '') {
            throw 'The Intent Name cannot be empty';
        }
        this.intent = newIntent;
    }
    // Getter & Setter for Intent Response
    getIntentResponse() {
        return this.response;
    }
    setIntentResponse(intentResponse) {
        intentResponse = intentResponse.trim();
        if (intentResponse === '') {
            throw 'The Intent Response cannot be empty';
        }
        this.response = intentResponsentent;
    }
    // Getter & Setter for Message
    getMessage() {
        return this.message;
    }
    setMessage(message) {
        message = message.trim();
        if (message === '') {
            throw 'The Message cannot be empty';
        }
        this.message = message;
    }
}
module.exports = IntentHistoryItem;