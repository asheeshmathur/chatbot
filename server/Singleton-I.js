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


        // Prepare an instance of corpus for chatbot from JSON file
        // JSON File representing details of Recipes

        try {
            this.corpusFile = fs.readFileSync(fileName);
            console.log("Recipe Corpus Exists");
            //Parse JSON
            this.corpus = JSON.parse(this.corpusFile);

            this.recipesCount = this.corpus.length

            //Count Recipes
            console.log("Total # of Recipes : " + this.recipesCount);

            // Map to hold all keywords & Recipe
            //  Recipe --> keywords
            this.recipeKeywords = new Map();

            // Map to hold all Answers & Intents
            // Intent -> Answers
            this.intentAnswers = new Map();

            //Intent -> Original Data Id
            this.recipeIdentifier = new Map()

            for (let i = 0; i < this.recipesCount; i += 1) {
                const {recipeId=i,recipeName, recipeCategory, prepTime, cookingTime,servings, recipeIngredients } =
                    this.corpus[i];
                const normalisedText= this.normalize(recipeName);
                const tempKeywords = this.tokenize(normalisedText);
                this.intentAnswers.set(recipeName, recipeName+" Preparation Time "+prepTime+" mins.  Cooking Time "+cookingTime+ "mins. Serves " +servings);
                this.recipeIdentifier.set(recipeName,recipeId);

                // Remove stop words from list as they do not add value
                this.keywordList=tempKeywords.filter(function (item)
                {
                    // List of stop words to be filtered out from the list
                    const stopWords = ['the', 'of', 'and', 'is','to','in','a','from','by','that', 'with', 'this', 'as', 'an', 'are','its', 'at', 'for'];

                    // Filter out stop words
                    return !stopWords.includes(item);
                })


                this.recipeKeywords.set(recipeName,this.keywordList)


            }
            console.log("Server Started")

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

    // Filter out all stop words
    array2;
    filterStopWords(array){
        this.array2=[]
        // Remove stop words from list as they do not add value
        this.array2=array.filter(function (item)
        {
            // Filter out stop words
            return !stopWords.includes(item);
        })

    }


    // Generate random number in a range
    randomNumber(min, max) {
        return Math.trunc(Math.random() * (max - min) + min);
    }
    welcomeMsg(){

        return "Welcome !, How can I help you ";

    }

    // Get Basic Intents
    getIntentFromText(rawText){
        let tokenizedText =[]
        // Normalise Text
        const normalisedTextOne = this.normalize(rawText);
        // Tokenize
        const tempTokenizedText= this.tokenize(normalisedTextOne);
        // Remove Stop Words
        tokenizedText=tempTokenizedText.filter(function (item)
        {
            // List of stop words to be filtered out from the list
            const stopWords = ['the', 'of', 'and', 'is','to','in','a','from','by','that', 'with', 'this', 'as', 'an', 'are','its', 'at', 'for'];

            // Filter out stop words
            return !stopWords.includes(item);
        })
        let hungryflag = false;
        // Collection of matching recipes
        // Array as it  supports multiple matching text
        //let returnKey = new Set();
        let returnKey = new Map();
        //Check for Hungry as a keyword
        //Pattern Matching to identify Recipe
        // Iterate the list of Keywords returns Intent as per the first keyword match
        for (let i = 0; i < tokenizedText.length; i++) {
            if(tokenizedText[i] == "hungry"){
                hungryflag = true;
                return "Sure, what would you like to eat ?"
            }
        }   //End of for loop

    }

    getIntentAnswers(key){
        let details =""
        details =this.intentAnswers.get(key)
        return details;
    }

    // Get Recipe id for extracting More Details
    getRecipeId(recipeName) {
        let text2="";
        text2=this.recipeIdentifier.get(recipeName);
        return text2;
    }
    // Get Recipe Name based on string, a collection of intents extracted from message
    extractRecipesFromText(rawText) {
        let tokenizedText =[]
        const normalisedTextOne = this.normalize(rawText);
        const tempTokenizedText= this.tokenize(normalisedTextOne)

        tokenizedText=tempTokenizedText.filter(function (item)
        {
            // List of stop words to be filtered out from the list
            const stopWords = ['the', 'of', 'and', 'is','to','in','a','from','by','that', 'with', 'this', 'as', 'an', 'are','its', 'at', 'for'];

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

            this.recipeKeywords.forEach((value, key) => {
                // Iterate through all keys of this intent
                for (let j = 0; j < value.length; j += 1) {
                    //Change case of Value as well
                    let lowerCaseValue = value[j].toLowerCase();

                    // Check if match is successfully
                    if (tokenizedText[i] == lowerCaseValue)
                    {
                        foundCount++;

                        // Add Corresponding Intent
                        if (returnKey.has(key))
                        {
                            let count =0;
                            count =returnKey.get(key);
                            returnKey.set(key, count+1)
                        }
                        else{
                            returnKey.set(key, 1)

                        }
                    }

                }

            });
        }


        if (foundCount > 0) {
            return returnKey ;

        }
        else{
            // Means this is general - No matching recipe found
            return returnKey.set("general",1) ;
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
            //searchIntent= this.choiceIntent;
            searchIntent= intentArray[0]
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
