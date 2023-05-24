var fs = require('fs');
class Corpus {

    //Constructor - Accepts the JSON file name representing corpus
    constructor(fileName) {
        //Check whether an instance has already been created
        if (Corpus.instance instanceof Corpus) {
            // Will always return a prebuilt corpus
            return Corpus.instance;
        }
        Corpus.instance = this;

        // Prepare an instance of corpus for chatbot from JSON
        // JSON File representing details of Intents , Keywords and Actions

        try {
            this.corpusFile = fs.readFileSync(fileName);
            console.log("Corpus Exists");
            //Extract JSON
            this.corpus = JSON.parse(this.corpusFile);
            console.log("Corpus Name : " + this.corpus.name);

            //Count Intents
            console.log("Total # of Intents : " + this.corpus.data.length);

            // Map to hold all keywords & Intents
            // keyword -> Intent
            this.keywordIntent = new Map();

            // Map to hold all Answers & Intents
            // Intent -> Answers
            this.intentAnswers = new Map();

            //Map to hold all keywords
            // Populate Keywords
            this.intentKeywords = new Map();

            //Choice Intent
            this.choiceIntent = "choice";
            //Answer Array
            this.answerArray=[]
            // Extract Map of all Keywords & Their Intents
            for (let i = 0; i < this.corpus.data.length; i += 1) {
                const {intent, keywords, answers} = this.corpus.data[i];
                this.intentAnswers.set(intent, answers);
                this.intentKeywords.set(intent, keywords);

                // Keyword - Intent
                for (let j = 0; j < keywords.length; j += 1) {
                    this.keywordIntent.set(keywords[j], intent);
                }
            }

        } catch (error) {
            console.log("Some thing Wrong ");
            console.log("Error: Corpus Does Not Exists");
            throw("Invalid JSON file passed");
        }
    } // End Constructor

    // Normalize input text and convert it to small case
    normalize(text) {
       return text
            .normalize()
            .toLowerCase();
    }
    // Tokenize after removing unnecessary characters (regex)
    tokenize(text) {
        //regex based
        return text.split(/[\s,.!?;:([\]'"¿¡)/]+/);
    }
    // Get Intent based on string, a collection of intents extracted from message
    extractIntentFromText(rawText) {

        const normalisedText= this.normalize(rawText);
        const tokenizedText= this.tokenize(normalisedText)

        let position = 0;
        let foundCount =0;
        // Collection of matching intents
        // Array as it  supports multiple matching text
        let returnKey = new Set();
        let answer ="" ;

        //Pattern Matching to identify Intent
        // Iterate the list of Keywords returns Intent as per the first keyword match
        for (let i = 0; i < tokenizedText.length; i++) {

            this.intentKeywords.forEach((value, key) => {
                // Iterate through all keys of this intent
                for (let j = 0; j < value.length; j += 1) {
                    //Change case of Value as well
                    let lowerCaseValue = value[j].toLowerCase();

                    // Check if match is successfully
                    if (tokenizedText[i] == lowerCaseValue)
                    {
                        foundCount++;
                        // Object with Intent as well as random answer
                        const answer ={"Intent":key, "Answer":this.intentAnswers.values(key)};

                        // Add Corresponding Intent
                        returnKey.add(key)
                    }
                }

            });
        }

        // Means this is general
        if (foundCount > 0) {
            return returnKey ;

        }
        else{
            // Return
            return returnKey.add("general") ;
        }

    }

    // Get All Answers for a specific intent
    allAnswersString(intent) {

        const allAns = this.intentAnswers.get(intent);
        let result = ""
        for (let j = 0; j < allAns.length; j += 1) {
            result += (j + 1) + ". " + allAns[j];
        }
        return result;
    }
    //Retrieve all Answers for an Intent
    answerArray(intent)
    {
        let count = (this.intentAnswers.get(intent)).length;
        return count;
    }
    // Select one Random Answer from a collections of Answers of an Intent
    // If there are multiple intents, select first one for anwert
    randomAnswer(intent) {
        // Convert Set to an array
        const intentArray = [...intent];
        //Intent to searcch
        let searchIntent = "" ;
        // Check size of intent, it should be > 0
        if(intentArray.length >1)
        {
            searchIntent= this.choiceIntent;
        }
        else{
            // searchIntent= intent[0];
            searchIntent= intentArray[0];

        }
        // Retrieve All Answers for this Intent
        const answerArray = this.intentAnswers.get(searchIntent);

        //Randomly Select an Answer
        return answerArray[Math.floor(Math.random() * answerArray.length)];



    }
    //Retrieve all Answers for an Intent
    continuationMsg(intent)
    {
        let count = (this.intentAnswers.get(intent)).length;
        return count;
    }
}

module.exports = Corpus;