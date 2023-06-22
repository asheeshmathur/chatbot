var fs = require('fs');
class IntentCorpus {

    //Constructor - Accepts the JSON file name representing corpus
    constructor(fileName) {
        //Check whether an instance has already been created
        if (IntentCorpus.instance instanceof IntentCorpus) {
            // Will always return a prebuilt corpus
            return IntentCorpus.instance;
        }
        IntentCorpus.instance = this;

        // Prepare an instance of corpus for chatbot from JSON
        // JSON File representing details of Intents , Keywords and Actions

        try {
            this.corpusFile = fs.readFileSync(fileName);
            console.log("IntentCorpus Exists");
            //Extract JSON
            this.corpus = JSON.parse(this.corpusFile);
            console.log("IntentCorpus Name : " + this.corpus.name);

            //Count Intents
            console.log("Total # of Intents : " + this.corpus.data.length);

            // Map to hold all keywords & Intents
            // keyword -> Intent
            this.keywordIntent = new Map();

            // Map to hold all Answers & Intents
            // Intent -> Answers
            this.intentAnswer = new Map();

            //Map to hold all keywords
            // Populate Keywords
            this.intentKeywords = new Map();

            //Choice Intent
            this.choiceIntent = "choice";
            //Answer Array
            this.answerArray=[]
            // Extract Map of all Keywords & Their Intents
            for (let i = 0; i < this.corpus.data.length; i += 1) {
                const {intent, keywords, answer} = this.corpus.data[i];
                this.intentAnswer.set(intent, answer);
                this.intentKeywords.set(intent, keywords);

                // Keyword - Intent
                for (let j = 0; j < keywords.length; j += 1) {
                    this.keywordIntent.set(keywords[j], intent);
                }
            }

        } catch (error) {
            console.log("Some thing Wrong ");
            console.log("Error: IntentCorpus Does Not Exists");
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

    // Get Answer(s) as per  intent
    getAnswer(intent){
        let result = "";
        if (intent != null){
            intent.forEach(element => {
                result = result + this.intentAnswer.get(element);

            });
        }
        return result;
    }
    // Get Intent(s) based on string, a collection of intents extracted from message
    extractIntentsFromText(rawText) {
        let tokenizedText =[]
        const normalisedTextOne = this.normalize(rawText);
        const tempTokenizedText= this.tokenize(normalisedTextOne)

        tokenizedText=tempTokenizedText.filter(function (item)
        {
            // List of stop words to be filtered out from the list
            const stopWords = ['the', 'of', 'and', 'is','to','in','a','from','by','that', 'with',  'as', 'an', 'are','its', 'at', 'for'];

            // Filter out stop words
            return !stopWords.includes(item);
        })

        let position = 0;
        let foundCount =0;
        // Collection of matching recipes
        // Array as it  supports multiple matching text
        //let returnKey = new Set();
        let returnKey = new Map();

        //Pattern Matching to identify Recipe
        // Iterate the list of Keywords returns Intent as per the first keyword match
        for (let i = 0; i < tokenizedText.length; i++) {
            // Iterate through each intent in a map
            for (let [key, value] of this.intentKeywords) {

                for (let j = 0; j < value.length; j++) {
                    if (value[j].includes(tokenizedText[i])){
                        foundCount++;
                        // Add Corresponding Intent

                        if (returnKey.has(key))
                        {
                            let count =0;
                            count =returnKey.get(key);
                            returnKey.set(key, count+1);

                        }
                        else{
                            let count =1;
                            returnKey.set(key,count);
                        }

                    } // end if
                }// End for J
            }
            /*
            if (foundCount > 0)
            {
                return returnKey;
            }
            else{
                // Means this is general - No matching recipe found
                return returnKey.set("general",1) ;
            }

             */
            return returnKey;

        }


    }

    // Get All Answers for a specific intent
    allAnswersString(intent) {

        const allAns = this.intentAnswer.get(intent);
        let result = ""
        for (let j = 0; j < allAns.length; j += 1) {
            result += (j + 1) + ". " + allAns[j];
        }
        return result;
    }
    //Retrieve all Answers for an Intent
    answerArray(intent)
    {
        let count = (this.intentAnswer.get(intent)).length;
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
        const answerArray = this.intentAnswer.get(searchIntent);

        //Randomly Select an Answer
        return answerArray[Math.floor(Math.random() * answerArray.length)];



    }
    //Retrieve all Answers for an Intent
    continuationMsg(intent)
    {
        let count = (this.intentAnswer.get(intent)).length;
        return count;
    }
}

module.exports = IntentCorpus;