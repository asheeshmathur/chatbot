var os = require('os');
const express = require("express")
const app = express()
const cors = require("cors")
const http = require('http').Server(app);
app.use(express.static('public'));
const PORT = process.env.PORT || 3000

// Reference to Utterances and Intent Corpus
const IntentCorpus = require("./IntentCorpus.js");

// Reference to Recipe Corpus
const RecipeCorpus = require("./RecipeCorpus.js");

const {Socket} = require("socket.io");

// Instantiate Recipe Corpus
const recipeCorpus = new RecipeCorpus("./data.json");

// Instantiate Intent Corpus
const intentCorpus = new IntentCorpus("./utterancesIntents.json");

// Set Socket IO
const socketIO = require('socket.io')(http, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});
//To keep track of all connected users
let socketsWorkflowMap = new Map();
let workflowStep = 0;

//Initializing various parameters
let users = []
//List of Recipes
let rcpList="";

// Prepares messages as per workflow step
// All messages should be externalised in json file
function prepareMessage(workflowStep,recpList, rCorpus,addData ){
    let message="";
    let continueMsg = "  Enter 'c' or any key in text box below to continue your journey";

    switch (workflowStep) {
        case 3:
            // Filter Recipes based on cooking time
            message = workflowStep + " | " + "Good, how much cooking time (in minutes) you have in mind in Minutes. ? Please enter a Number ";
            break;

        case 4:
            //Cooking time received
            cookingTime = addData;
            let extractedCkTime = 0
            message = workflowStep + " | " + "Here are Recipes Matching Your Cooking Time ";
            // Iterate
            for (let i = 0; i < recpList.length; i++) {
                let j =i+1
                let map = recipeCorpus.getRecipeDetailsByName(recpList[i]);
                extractedCkTime = map.get("prepTime") + map.get("cookingTime");
                if (extractedCkTime <= addData) {
                    message = message +" "+j+" . "+ map.get("recipeName");
                }
            }
            message = message+continueMsg;

            break;
        case 5:
            message = workflowStep + " | " + "Filter recipes based its Difficulty Level. Easy: [1], Moderate:[2] ,Difficult:[3] . Enter corresponding code [Number 1-3]";
            break;
        case 6:
            //Difficulty Level  [Easy : 1, Moderate:2, Difficult:3]
            let diffMap = new Map();
            diffMap.set("EASY", 1);
            diffMap.set("MODERATE", 2);
            diffMap.set("HARD", 3);
            message = workflowStep + " | " + "Here are Recipes Matching Your Cooking Difficulty Level ";
            // Iterate
            for (let i = 0; i < recpList.length; i++) {
                let map = recipeCorpus.getRecipeDetailsByName(recpList[i]);
                let j = i+1;
                extractedComplexity = map.get("difficulty");
                if (diffMap.get(extractedComplexity) == addData) {
                    message = message +j+ ". "+map.get("recipeName");
                }
            }
            message=message+continueMsg;

            break;
        case 7:
            message = workflowStep + " | " + "View the ingredients of above Recipe. Enter 'c' or any other key to continue";
            break;
        case 8:
            let ingredientList = [];
            for (let i = 0; i < recpList.length; i++) {
                let map = recipeCorpus.getRecipeDetailsByName(recpList[i]);
                ingredientList = map.get("recipeIngredients");
                message = workflowStep + " | " + "Here are ingredients ";
                // Iterate Ingredients
                for (let i = 0; i < ingredientList.length; i++) {
                    // Add from list
                    message = message + " |  " + ingredientList[i]["ingredient"]["ingredientName"];

                }
                message=message+continueMsg;
            }
            break;
        case 9:
            for (let i = 0; i < recpList.length; i++) {
                let map = recipeCorpus.getRecipeDetailsByName(recpList[i]);
                message = workflowStep + " | " + "This recipe is for  : " + map.get("servings");
                message = message +
                    ` Servings, Would you like to view it's Proportion Value & Unit of ingredients. Press C to view`;
            }
            break;
        case 10:
            let ingList = [];
            for (let i = 0; i < recpList.length; i++) {
                let map = recipeCorpus.getRecipeDetailsByName(recpList[i]);
                ingList = map.get("recipeIngredients");
                message = workflowStep + " | " + "Here are ingredients with Portion Details ";
                // Iterate Ingredients
                for (let i = 0; i < ingList.length; i++) {
                    // Add from list
                    message = message + " |  " + ingList[i]["ingredient"]["ingredientName"] + "  " + ingList[i]["proportionValue"] + " " + ingList[i]["proportionUnit"];

                }
                message=message+ continueMsg;
            }
            break;
        case 11:

            for (let i = 0; i < recpList.length; i++) {
                message="";
                let map = recipeCorpus.getRecipeDetailsByName(recpList[i]);
                let detailedRecipe =map.get("recipeDescription");
                message = workflowStep +" |  " + detailedRecipe+
                    "-------------[These recipes & Ingrdients are as per serving size specified"+
                    "You can adjust and alter these as per you"+
                    "Wishing you Good Luck ...with your adventures"+
                    "Thanks for using these services ...drop us an email at  --for your Feedback & Suggestions"+ " Enter Any Key To Continue Your Journey";

            }
            break;
        case 12:
            message="To continue Exploring this Cornucopia "+continueMsg+"....";
            break;


        default:
            // yet to come
            break;
    }

    return message;

}
socketIO.on('connection', (socket) => {
    // Manage the Steps of Conversations

    let respondBack = false;
    let triggerResponse= false;
    let noMatchFlag = false;
    let showStaticMessage= false;
    let isError = false

    console.log(`⚡: ${socket.id} user just connected!`)
    // Add user/socket in list
    socketsWorkflowMap.set(socket.id,1);

    // Welcome Message on establishing connection
    // Start workflowStep
    workflowStep = 1;

    socketIO.emit("messageResponse", {
        text: workflowStep+" | "+recipeCorpus.welcomeMsg(),
        name: "AI Agent",
        id: Math.random(),
        socketID: socketIO.id
    })
    //Reverts message back to chatbot
    socket.on("messageDisplay", data => {
        console.log("Socket to be responded: " + socket.id);
        let replyto = socket.id;
        // Ping Back what user has typed in
        socketIO.to(replyto).emit("messageResponse",
            {
                text: data.text,
                name: data.name,
                id: data.id,
                socketID: data.socketID
            })

    }); //message display

    // Function to Manage Workflow
    function processWorkFlow(socketsWorkflowMap,socketId,data){
        let recipeList = []
        // Workflow of the Chatbot
        workflowStep= socketsWorkflowMap.get(socketId);
        switch(workflowStep){
            //Recipe List

            case 1:
                let intentMap = new Map();
                let recipes="";
                intentMap = intentCorpus.extractIntentsFromText(data.text);
                recipes = "";
                if (intentMap.size > 0){
                    //Increment Step only if no errors
                    socketsWorkflowMap.set(socketId,2);
                    workflowStep=workflowStep+1;

                    recipes = workflowStep+" | "+"We have identified following Recipes  ";
                    let j =1;
                    for (let key of intentMap.keys()) {

                        // Get Flags associated with these recipes
                        let rcpArray = (intentCorpus.intentRecipies.get(key));
                        rcpList = rcpArray;
                        recipes=recipes +" " +j+" . "+rcpArray;
                        j++;
                    }
                    recipes=recipes+" Enter any key to continue. "

                }
                else{
                    socketsWorkflowMap.set(socketId,1);
                    workflowStep = 1;
                    recipes = "No Matching Recipe, Try other Options ";
                    isError = true;
                }
                responseMessage = recipes;
                return responseMessage;
                showStaticMessage=true;
                break;

            case 2:
                // Display StaticMessage as per workflow step
                // Increment W/F Step
                socketsWorkflowMap.set(socketId,3);

                responseMessage =  prepareMessage(3,rcpList,recipeCorpus,"");
                return responseMessage;
                break;
            case 3:
                //Increment Step only if no errors
                if (isNaN(data.text)){
                    socketsWorkflowMap.set(socketId,3);
                    responseMessage = "Enter Valid Numeric Values";
                    isError = true;
                    console.log("After Analysing: Input Error");
                }
                else{
                    //processing time input received
                    // Complex  Call for processing
                    socketsWorkflowMap.set(socketId,4);
                    // Extract Cooking Time from Input and pass it to prepareMessage
                    responseMessage=prepareMessage(4,rcpList,recipeCorpus,data.text);
                }
                return responseMessage;
                break;

            case 4:
                // Complex  Call for processing
                socketsWorkflowMap.set(socketId,5);
                // Extract Cooking Time from Input and pass it to prepareMessage
                responseMessage=prepareMessage(5,rcpList,recipeCorpus,data.text);
                return responseMessage;
                break;

            case 5:
                // Received Complexity Number
                //Increment Step only if no errors
                if (isNaN(data.text) ){
                    socketsWorkflowMap.set(socketId,5);
                    responseMessage = "Not Valid Numeric [1-3] Value";
                    isError = true;
                }
                else{
                    socketsWorkflowMap.set(socketId,6);
                    // Extract Complexity calculation from Input and pass it to prepareMessage
                    responseMessage = prepareMessage(6,rcpList,recipeCorpus,data.text);
                }
                return responseMessage;
                break;
            case 6:
                socketsWorkflowMap.set(socketId,7);
                // Received Complexity Number
                //Increment Step only if no errors     // Extract Complexity calculation from Input and pass it to prepareMessage
                responseMessage = prepareMessage(7,rcpList,recipeCorpus,data.text);

                return responseMessage;
                break;
            case 7:
                socketsWorkflowMap.set(socketId,8);
                responseMessage = prepareMessage(8,rcpList,recipeCorpus,data.text);
                return responseMessage;
                break;
            case 8:
                socketsWorkflowMap.set(socketId,9);
                // Extract ingredients of Recipes
                responseMessage = prepareMessage(9,rcpList,recipeCorpus,data.text);
                return responseMessage;
                break;
            case 9:
                socketsWorkflowMap.set(socketId,10);
                // Extract ingredients of Recipes with Portions & Units
                responseMessage = prepareMessage(10,rcpList,recipeCorpus,data.text);
                return responseMessage;
                break;
            case 10:
                socketsWorkflowMap.set(socketId,11);
                // Extract Recipes
                responseMessage = prepareMessage(11,rcpList,recipeCorpus,data.text);
                return responseMessage;
                break;
            case 11:
                socketsWorkflowMap.set(socketId,12);
                // End of Workflow
                responseMessage = prepareMessage(12,rcpList,recipeCorpus,data.text);
                // Set workflow step to 1
                socketsWorkflowMap.set(socketId,0);
                return responseMessage;
                break;
        }// Switch End
    }
    socket.on("message", data => {
        let replyto = socket.id;
        // Message to be displayed
        responseMessage=processWorkFlow(socketsWorkflowMap,replyto,data);
        socketIO.to(replyto).emit("messageResponse", {
                text: responseMessage,
                name: "AI Agent",
                id: data.id,
                socketID: data.socketID
        })



    }); //W/F Message display

    socket.on('disconnect', () => {
        console.log('🔥: A user disconnected');

        users = users.filter(user => user.socketID !== socket.id)
        //Removing disconnecting socket record
        eventLogger.removeDetails(socket.id)
        socketIO.emit("newUserResponse", users)
        socket.disconnect()
    });
})

http.listen(PORT, () => {
    console.log(`Server listening on ${PORT}`);
});
