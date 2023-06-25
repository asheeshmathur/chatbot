var os = require('os');
const express = require("express")
const app = express()
const cors = require("cors")
const http = require('http').Server(app);
app.use(express.static('public'));
const PORT = process.env.PORT || 3000


const IntentHistoryItem = require("./IntentHistoryItem.js");
const IntentHistoryStack = require("./IntentHistoryStack.js");
const EventLogger = require("./EventLogger.js");

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
let sockets = [];

// Logger for all socket events between client & server
let eventLogger = new EventLogger();

//Initializing various parameters
let users = []
//List of Recipes
let rcpList="";

// Prepares messages as per workflow step
// All messages should be externalised in json file
function prepareMessage(workflowStep,recpList, rCorpus,addData ){
    let message="";
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
                let map = recipeCorpus.getRecipeDetailsByName(recpList[i]);
                extractedCkTime = map.get("prepTime") + map.get("cookingTime");
                if (extractedCkTime <= addData) {
                    message = message + map.get("recipeName");
                }
            }
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
                extractedComplexity = map.get("difficulty");
                if (diffMap.get(extractedComplexity) == addData) {
                    message = message + map.get("recipeName");
                }
            }
            break;
        case 7:
            message = workflowStep + " | " + "Would you like to view the ingredients of above Recipe. Choose 1 for Yes & 2 for No. Please enter corresponding code [Number 1 or 2]";
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
            }
            break;
        case 9:
            for (let i = 0; i < recpList.length; i++) {
                let map = recipeCorpus.getRecipeDetailsByName(recpList[i]);
                message = workflowStep + " | " + "This recipe is for  : " + map.get("servings");
                message = message +
                    ` Servings, Would you like to view it's Proportion Value & Unit of ingredients. Press [1] : Yes  & [2]: No  Your choices please [Number 1 or 2]`;
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
                "Thanks for using these services ...drop us an email at  --for your Feedback & Suggestions";
                 
            }
            break;
        case 12:
                message="These recipes & Ingrdients are as per serving size specified"+
                         "You can adjust and alter these as per you"+
                "Wishing you Good Luck ...with your adventures"+
                "Thanks for using these services ...drop us an email at  --for your Feedback & Suggestions";
            break;
            
        case 13:
            for (let i = 0; i < recpList.length; i++) {
                let map = recipeCorpus.getRecipeDetailsByName(recpList[i]);
                let servesPersons = map.get("servings");
                message = workflowStep + " | " + "This recipe serves : " + servesPersons;
                message = message + "These proportions will serve… people. I would suggest you to scale  & adjust proportions size accordingly.";

            }
            break;

        default:
            // yet to come
            break;
    }

    return message;

}
socketIO.on('connection', (socket) => {
    // Manage the Steps of Conversations
    let workflowStep = 0;
    let respondBack = false;
    let triggerResponse= false;
    let noMatchFlag = false;

    console.log(`⚡: ${socket.id} user just connected!`)

    // Add user/socket in list
    sockets.push(socket.id);
    
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
    
    socket.on("message", data => {
        let replyto = socket.id;
        // Message to be displayed

        let responseMessage="";
        // Workflow of the Chatbot
        if (workflowStep == 1){
            // Present Recipes
            let intentMap = new Map();
            let recipes="";
            intentMap = intentCorpus.extractIntentsFromText(data.text);
            recipes = "";
            if (intentMap.size > 0){
                //Increment Step only if no errors
                workflowStep = 2;
                recipes = workflowStep+" | "+"We have identified following Recipes  ";
                for (let key of intentMap.keys()) {
                    // Get Flags associated with these recipes
                    let rcpArray = (intentCorpus.intentRecipies.get(key));
                    rcpList = rcpArray;
                    recipes=recipes+ " "+rcpArray;
                }
                respondBack=true;
            }
            else{
                recipes = "Sorry, we could not identify any recipes matching your criteria, please refine search.";
                noMatchFlag = true;
            }
        responseMessage = recipes;

        }
        else if (workflowStep==3){
            //Increment Step only if no errors

            //processing time input received
            // Complex  Call for processing
            workflowStep=4;
            // Extract Cooking Time from Input and pass it to prepareMessage
            responseMessage=prepareMessage(workflowStep,rcpList,recipeCorpus,data.text);
            respondBack=true;

        }
        else if (workflowStep==5){
            // Received Processing time from user - change step
            //Increment Step only if no errors
            workflowStep=6;
            // Extract Complexity calculation from Input and pass it to prepareMessage
            responseMessage = prepareMessage(workflowStep,rcpList,recipeCorpus,data.text);
            respondBack=true;

        }
        else if (workflowStep == 7){
            // Received Difficulty Level from user
            workflowStep=8;
            // Extract ingredients of Recipes  
            responseMessage = prepareMessage(workflowStep,rcpList,recipeCorpus,data.text);
            respondBack=true;
        }
        else if (workflowStep == 9){
            workflowStep=10;
            // Extract ingredients of Recipes with Portions & Units
            responseMessage = prepareMessage(workflowStep,rcpList,recipeCorpus,data.text);
            respondBack=true;
        }
        else if (workflowStep == 10){
            workflowStep=11;
            // Extract ingredients of Recipes with Portions & Units
            responseMessage = prepareMessage(workflowStep,rcpList,recipeCorpus,data.text);
            respondBack=true;
        }


        socketIO.to(replyto).emit("messageResponse", {
        text: responseMessage,
        name: "AI Agent",
        id: data.id,
        socketID: data.socketID
        })
        // Generate messages to be displayed
        if (triggerResponse=true){
            if (workflowStep == 2){
                workflowStep = 3;
                // Simple Processing
                msg =  prepareMessage(workflowStep,rcpList,recipeCorpus,"");
                triggerResponse=true;

            }
            else if (workflowStep == 4){
                workflowStep=5;
                //Simple Processing , ask for complexity
                msg =  prepareMessage(workflowStep,rcpList,recipeCorpus,"");
                triggerResponse=true;
            }
            else if (workflowStep == 6){
                workflowStep=7;
                //Simple Processing , ask for ingredients
                msg =  prepareMessage(workflowStep,rcpList,recipeCorpus,"");
                triggerResponse=true;
            }
            else if (workflowStep == 8){
                workflowStep=9;
                //Simple Processing , ask for portions of ingredients
                msg =  prepareMessage(workflowStep,rcpList,recipeCorpus,"");
                triggerResponse=true;
            }
            else if (workflowStep == 10){
                workflowStep=11;
                //Simple Processing , recipe details
                msg =  prepareMessage(workflowStep,rcpList,recipeCorpus,"");
                triggerResponse=true;
            }
            else if (workflowStep == 11){
                workflowStep=12;
                //Simple Processing , last message
                msg =  prepareMessage(workflowStep,rcpList,recipeCorpus,"");
                triggerResponse=true;
            }


            socketIO.to(replyto).emit("messageResponseCont", {
                text: msg,
                name: "AI Agent",
                id: data.id,
                socketID: data.socketID
            })

            // Not Working
            if(workflowStep ==11 && triggerResponse==true ){
                msg =  prepareMessage(workflowStep,rcpList,recipeCorpus,"");
                socketIO.to(replyto).emit("messageResponseCont", {
                    text: msg,
                    name: "AI Agent",
                    id: data.id,
                    socketID: data.socketID
                })
            }

        }
    })

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
