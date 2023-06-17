// Import History
const IntentHistoryItem = require("./IntentHistoryItem.js");

// Implements Stack Representing History
class IntentHistoryStack {

    constructor(){
        this.IntentHistoryItem = [];
        this.top = 0;
    }
    push(element) {
        this.IntentHistoryItem[this.top] = element;
        this.top = this.top + 1;
    }
    stacklength() {
        return this.top;
    }
    peek() {
        return this.IntentHistoryItem[this.top-1];
    }
    isEmpty() {
        return this.top == 0;
    }
    stackpop() {
        if( this.isEmpty() == false ) {
            this.top = this.top -1;
            return this.IntentHistoryItem.pop(); // last element gets deleted
        }
    }
    iterateItem() {
        var t = this.top - 1;
        while(t >= 0) {
            console.log(this.data[top]);
            t--;
        }
    }
    reverse() {
        this.rev (this.top - 1 );
    }
    rev(index) {
        if(index != 0) {
            this.rev(index-1);
        }
        console.log(this.IntentHistoryItem[index]);
    }
}

module.exports = IntentHistoryStack;