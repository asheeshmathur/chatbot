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

// Instantiate Recipe Corpus
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
let continuationFlag = false;

console.log(`Ready to Serve`);

// Logger for all socket events between client & server
let eventLogger = new EventLogger();

//Initializing various parameters
let users = []
let retAnswer ="";
let recipeId= -1;
let rcpList="";

function prepareMessage(workflowStep,recpList, rCorpus,addData ){
    let message="";
    if (workflowStep == 3){
        // Simple
        // Recipes served
        message = workflowStep+" | "+"Sure, how much cooking time (in minutes) do you have ? Please enter a numeric figure only "
    }
    else if (workflowStep==4){
        // Complex
        //Cooking time received
        cookingTime = addData;
        let extractedCkTime =0
        message = workflowStep+" | "+"Here are Recipes Matching Your Cooking Time ";
        // Iterate
        for (let i = 0; i < recpList.length; i++) {
            let map = recipeCorpus.getRecipeDetailsByName(recpList[i]);
            extractedCkTime = map.get("prepTime")+map.get("cookingTime");
            if (extractedCkTime <= addData){
                message = message+ map.get("recipeName");
            }
        }
    }
    else if (workflowStep == 5 ){
        // Simple
        message =workflowStep+" | "+"Would you like instead go Difficulty Level for an Easy: 1, Moderate:2 or a Difficult:3 recipe?. Please enter corresponding code [Number 1-3]"
    }
    else if (workflowStep == 6 ){
        // Complex
        //Difficulty Level  [Easy : 1, Moderate:2, Difficult:3]
        let diffMap = new Map();
        diffMap.set("EASY",1);
        diffMap.set("MODERATE",2);
        diffMap.set("HARD",3);
        message = workflowStep+" | "+"Here are Recipes Matching Your Cooking Difficulty Level ";
        // Iterate
        for (let i = 0; i < recpList.length; i++) {
            let map = recipeCorpus.getRecipeDetailsByName(recpList[i]);
            extractedComplexity = map.get("difficulty");
            if (diffMap.get(extractedComplexity) == addData){
                message = message+ map.get("recipeName");
            }
        }
        
    }
    else if (workflowStep ==7){
        // Simple
        message =workflowStep+" | "+"Would you like to view the ingredients of above Recipe. Choose 1 for Yes & 2 for No. Please enter corresponding code [Number 1 or 2]"
        
    }
    else if (workflowStep == 8){
        // Complex
        // Iterate
        let ingList = [];
        for (let i = 0; i < recpList.length; i++) {
            let map = recipeCorpus.getRecipeDetailsByName(recpList[i]);
            ingList = map.get("recipeIngredients");
            message = "Here are ingredients ";
            // Iterate Ingredients
            for (let i =0; i< ingList.length; i++){
                // Add from list
                message = message+" |  "+ingList[i]["ingredient"]["ingredientName"];
                
            }
           
        }
    }
    return message;

}
socketIO.on('connection', (socket) => {
    // Manage the Steps of Conversations
    let workflowStep = 0;
    let respondBack = false;
    let triggerResponse= false;

    
    // Add its record in map,
    entry = new IntentHistoryItem("CONN","REQ","None");
    eventLogger.addItem(socket.id,entry)
    console.log(`⚡: ${socket.id} user just connected!`)
    // Emit the connected users when a new socket connects
    let sock = socket.id;
    sockets.push(sock);
    
    // Welcome Message on establishing connection
    entry = new IntentHistoryItem("CONN","WelConnection-I","WELCOME-MSG");
    eventLogger.addItem(socket.id, entry)
    // Increment workflowStep
    workflowStep = 1;
    socketIO.emit("messageResponse", {
    text: workflowStep+" | "+recipeCorpus.welcomeMsg(),
    name: "AI Agent",
    id: Math.random(),
    socketID: socketIO.id
    })

    
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
        let responseMessage=""
        //Check Workflow Step
        if (workflowStep == 1){
            // Present Recipes
            let intentMap = new Map();
            let recipes="";
            intentMap = intentCorpus.extractIntentsFromText(data.text);
            recipes = "";
            if (intentMap.size > 0){
                //Increment Step
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
            }
        responseMessage = recipes;

        }
        else if (workflowStep==3){
            //processing time input received
            // Complex  Call for processing
            workflowStep=4;
            // Extract Cooking Time from Input and pass it to prepareMessage
            responseMessage=prepareMessage(workflowStep,rcpList,recipeCorpus,data.text);
            respondBack=true;

        }
        else if (workflowStep==5){
            workflowStep=6;
            // Extract Complexity calculation from Input and pass it to prepareMessage
            responseMessage = prepareMessage(workflowStep,rcpList,recipeCorpus,data.text);
            respondBack=true;

        }
        else if (workflowStep == 7){
            workflowStep=8;
            // Extract ingredients of Recipes  
            responseMessage = prepareMessage(workflowStep,rcpList,recipeCorpus,data.text);
            respondBack=true;
        }

        socketIO.to(replyto).emit("messageResponse", {
        text: responseMessage,
        name: "AI Agent",
        id: data.id,
        socketID: data.socketID
        })
        triggerResponse =true;
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


            socketIO.to(replyto).emit("messageResponseCont", {
                text: msg,
                name: "AI Agent",
                id: data.id,
                socketID: data.socketID
            })

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
