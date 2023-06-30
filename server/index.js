/**
 * Main backend component. Handles all requests, like connection/Disconnect
 * Integrates with both Recipe corpus - Data.json and Intent/Keyword spotting
 * based on keywords,
 * User input is directly passed to two corpus for parsing, normalization,removal of stop
 * words, case change, Tokenization, Normalization, Removal of Stop Words.
 * These tokens are then matched with keywords. Number of hits raises the score,
 * @type {{hostname(): string, getPriority(pid?: number): number, EOL: string, version(): string, UserInfo: UserInfo, NetworkInterfaceInfoIPv4: NetworkInterfaceInfoIPv4, CpuInfo: CpuInfo, arch(): string, platform(): NodeJS.Platform, networkInterfaces(): NodeJS.Dict<NetworkInterfaceInfo[]>, tmpdir(): string, freemem(): number, cpus(): CpuInfo[], SignalConstants: SignalConstants, uptime(): number, setPriority: {(priority: number): void, (pid: number, priority: number): void}, homedir(): string, NetworkInterfaceInfoIPv6: NetworkInterfaceInfoIPv6, constants: constants, totalmem(): number, release(): string, NetworkInterfaceInfo: NetworkInterfaceInfoIPv4 | NetworkInterfaceInfoIPv6, NetworkInterfaceBase: NetworkInterfaceBase, userInfo: {(options: {encoding: "buffer"}): UserInfo<Buffer>, (options?: {encoding: BufferEncoding}): UserInfo<string>}, devNull: string, loadavg(): number[], endianness(): ("BE" | "LE"), type(): string} | {hostname(): string, getPriority(pid?: number): number, availableParallelism(): number, EOL: string, version(): string, machine(): string, UserInfo: UserInfo, NetworkInterfaceInfoIPv4: NetworkInterfaceInfoIPv4, CpuInfo: CpuInfo, arch(): string, platform(): NodeJS.Platform, networkInterfaces(): NodeJS.Dict<NetworkInterfaceInfo[]>, tmpdir(): string, freemem(): number, cpus(): CpuInfo[], SignalConstants: SignalConstants, uptime(): number, setPriority: {(priority: number): void, (pid: number, priority: number): void}, homedir(): string, NetworkInterfaceInfoIPv6: NetworkInterfaceInfoIPv6, constants: constants, totalmem(): number, release(): string, NetworkInterfaceInfo: NetworkInterfaceInfoIPv4 | NetworkInterfaceInfoIPv6, NetworkInterfaceBase: NetworkInterfaceBase, userInfo: {(options: {encoding: "buffer"}): UserInfo<Buffer>, (options?: {encoding: BufferEncoding}): UserInfo<string>}, devNull: string, loadavg(): number[], endianness(): ("BE" | "LE"), type(): string} | {hostname(): string, getPriority(pid?: number): number, availableParallelism(): number, EOL: string, version(): string, machine(): string, UserInfo: UserInfo, NetworkInterfaceInfoIPv4: NetworkInterfaceInfoIPv4, CpuInfo: CpuInfo, arch(): string, platform(): NodeJS.Platform, networkInterfaces(): NodeJS.Dict<NetworkInterfaceInfo[]>, tmpdir(): string, freemem(): number, cpus(): CpuInfo[], SignalConstants: SignalConstants, uptime(): number, setPriority: {(priority: number): void, (pid: number, priority: number): void}, homedir(): string, NetworkInterfaceInfoIPv6: NetworkInterfaceInfoIPv6, constants: constants, totalmem(): number, release(): string, NetworkInterfaceInfo: NetworkInterfaceInfoIPv4 | NetworkInterfaceInfoIPv6, NetworkInterfaceBase: NetworkInterfaceBase, userInfo: {(options: {encoding: "buffer"}): UserInfo<Buffer>, (options?: {encoding: BufferEncoding}): UserInfo<string>}, devNull: string, loadavg(): number[], endianness(): ("BE" | "LE"), type(): string}}
 */
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
    let continueMsg = "  .Press any key to continue";
    let relevantRecipeList =[]
    switch (workflowStep) {
        case 1:
            // Start Over
            message= workflowStep+" | "+recipeCorpus.welcomeMsg();
            break;

        case 3:
            // Message to receive  on cooking time
            message = workflowStep + " | " + "Good choice, how much cooking time (in minutes) you have in mind? Please enter a Number Only ";
            break;

        case 4:
            //Cooking time received, filter result based on cooking time
            // Combination of Preparation & Cooking time
            cookingTime = addData;
            let extractedCkTime = 0
            message = workflowStep + " | " + "Here are Recipes Matching Your Cooking Time ";
            let matchCout = 0;
            if(recpList.length >0){
                for (let i = 0; i < recpList.length; i++) {
                    let map = recipeCorpus.getRecipeDetailsByName(recpList[i]);
                    if (map == null){
                        message ="No Match ...some error"
                    }
                    else{
                        let j =i+1
                        extractedCkTime = map.get("prepTime") + map.get("cookingTime");
                        if (extractedCkTime <= addData) {
                            message = message +" "+j+" . "+ map.get("recipeName");
                            relevantRecipeList.push(map.get("recipeName"));
                            matchCout = matchCout+1;
                            message = message+continueMsg;

                        }
                        if (matchCout == 0)
                        {
                            recpList=[];
                            message =
                                "No Recipes .. as per your Cooking Time(including Preparing Time)." +
                                "Try another recipes by pressing CAREFULLY ONLY 'q' or 'Q'. Good Luck ... ";
                        }

                    }

                }
            }
            break;
        case 5:
            if(recpList != null){
                // Message to enter difficulty Level
                message = workflowStep + " | " + "Filter recipes based on its Difficulty Level. Easy: [1], Moderate:[2] ,Difficult:[3] . Enter corresponding code [Number 1-3]";

            }
            break;
        case 6:
            //Difficulty Level  submitted , filter accordingly [Easy : 1, Moderate:2, Difficult:3]
            let diffMap = new Map();
            diffMap.set("EASY", 1);
            diffMap.set("MODERATE", 2);
            diffMap.set("HARD", 3);
            message = workflowStep + " | " + "Here are Recipes Matching Your Cooking Difficulty Level ";
            // Iterate and check
            for (let i = 0; i < recpList.length; i++) {
                let map = recipeCorpus.getRecipeDetailsByName(recpList[i]);
                let j = i+1;
                extractedComplexity = map.get("difficulty");
                if (diffMap.get(extractedComplexity) == addData) {
                    relevantRecipeList.push(map.get("recipeName"))
                    message = message +j+ ". "+map.get("recipeName");
                }
            }
            if (relevantRecipeList.length>0)
            {
                message=message+continueMsg;
            }
            else{
                message = "No Matching Recipes based on Difficulty Level Found,  No Worries press 'q' or 'Q' to continue exploring other options. Good Luck ..";
            }
            break;
        case 7:
            // Meesage to prompt for ingredients
            message = workflowStep + " | " + "View the ingredients of above Recipe"+ continueMsg;
            break;
        case 8:
            // Display Ingredients
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
                message=message+"Press 'q' or 'Q' to explore other items or Any Key to Proceed Further";
            }
            break;
        case 9:

            // Message to look at proportion level
            for (let i = 0; i < recpList.length; i++) {
                let map = recipeCorpus.getRecipeDetailsByName(recpList[i]);
                message = workflowStep + " | " + "This recipe is for  : " + map.get("servings");
                message = message +
                    ` Servings, Would you like to view it's Proportion Value & Unit of ingredients. Press 'c' or 'C' to view`;
            }
            break;
        case 10:

            // Pick recipe Ingredients with proportions
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
            // Display Recipe description

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
            //message to continue from start
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
    let triggerResponse = false;
    let noMatchFlag = false;
    let showStaticMessage = false;
    let isError = false

    console.log(`⚡: ${socket.id} user just connected!`)
    // Add user/socket in list
    socketsWorkflowMap.set(socket.id, 1);

    // Welcome Message on establishing connection
    // Start workflowStep
    workflowStep = 1;

    socketIO.emit("messageResponse", {
        text: workflowStep + " | " + recipeCorpus.welcomeMsg(),
        name: "AI Agent",
        id: Math.random(),
        socketID: socketIO.id
    })
    //Reverts message back to chat bot
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
    function processWorkFlow(socketsWorkflowMap, socketId, data) {
        let recipeList = []
        // Workflow of the Chat bot
        workflowStep = socketsWorkflowMap.get(socketId);
        switch (workflowStep) {

            case 1:
                let intentMap = new Map();
                let recipes = "";
                intentMap = intentCorpus.extractIntentsFromText(data.text);
                recipes = "";
                if (intentMap.size > 0) {
                    //Increment Step only if no errors
                    socketsWorkflowMap.set(socketId, 2);
                    workflowStep = workflowStep + 1;

                    recipes = workflowStep + " | " + "We have identified following Recipes  ";
                    let j = 1;
                    for (let key of intentMap.keys()) {
                        // Get Flags associated with these recipes
                        let rcpArray = (intentCorpus.intentRecipies.get(key));
                        rcpList = rcpArray;
                        if(rcpArray.length > 0){
                            for (let i =0; i<rcpArray.length;i++){
                                j = i+1;
                                recipes = recipes +"  , " + rcpArray[i];
                            }


                        }


                    }

                    recipes = recipes + " Press 'c/C' to continue & instead explore other options Press 'q/Q' . "

                }
                else{
                    socketsWorkflowMap.set(socketId, 1);
                    workflowStep = 1;
                    recipes = "No Matching Recipe found, Try other Options ";
                    isError = true;
                }
                responseMessage = recipes;
                return responseMessage;
                showStaticMessage = true;
                break;

            case 2:
                // Display StaticMessage as per workflow step
                // Increment W/F Step
                if ((data.text == "c") || (data.text == "C")) {
                    socketsWorkflowMap.set(socketId, 3);
                    responseMessage = prepareMessage(3, rcpList, recipeCorpus, "");

                } else if ((data.text == "q") || (data.text == "Q")) {
                    socketsWorkflowMap.set(socketId, 1);
                    responseMessage = workflowStep + " | " + recipeCorpus.welcomeMsgRepeat();
                } else {
                    responseMessage = "Wrong Choice, Please try again";
                    socketsWorkflowMap.set(socketId, 2);
                }
                return responseMessage;
            case 3:
                //Increment Step only if no errors
                if (isNaN(data.text)) {
                    socketsWorkflowMap.set(socketId, 3);
                    responseMessage = "Enter Valid Numeric Values";
                    isError = true;
                } else {
                    //processing time input received
                    // Complex  Call for processing
                    socketsWorkflowMap.set(socketId, 4);
                    // Extract Cooking Time from Input and pass it to prepareMessage
                    responseMessage = prepareMessage(4, rcpList, recipeCorpus, data.text);
                }
                return responseMessage;

            case 4:
                // Complex  Call for processing
                if ((data.text == "q") || (data.text == "Q"))
                {
                    socketsWorkflowMap.set(socketId, 1);
                    // Extract Cooking Time from Input and pass it to prepareMessage
                    responseMessage = recipeCorpus.welcomeMsgRepeat();

                } else {
                    socketsWorkflowMap.set(socketId, 5);
                    responseMessage = prepareMessage(5, rcpList, recipeCorpus, data.text);

                }
                return responseMessage;
            case 5:

                socketsWorkflowMap.set(socketId, 6);
                // Extract Complexity calculation from Input and pass it to prepareMessage
                responseMessage = prepareMessage(6, rcpList, recipeCorpus, data.text);
                return responseMessage;
            case 6:
                if ((data.text == 'q') || (data.text == 'Q')) {
                    socketsWorkflowMap.set(socketId, 1);
                    // Extract Cooking Time from Input and pass it to prepareMessage
                    responseMessage = recipeCorpus.welcomeMsgRepeat();

                } else {
                    socketsWorkflowMap.set(socketId, 7);
                    responseMessage = prepareMessage(7, rcpList, recipeCorpus, data.text);
                }

                return responseMessage;

            case 7:
                socketsWorkflowMap.set(socketId, 8);
                responseMessage = prepareMessage(8, rcpList, recipeCorpus, data.text);
                return responseMessage;
            case 8:
                if ((data.text=='q')||(data.text == 'Q'))
                {
                    socketsWorkflowMap.set(socketId, 1);
                    recipeCorpus.welcomeMsgRepeat();
                }
                else{
                    socketsWorkflowMap.set(socketId, 9);
                    // Extract ingredients of Recipes
                    responseMessage = prepareMessage(9, rcpList, recipeCorpus, data.text);

                }
                return responseMessage;
            case 9:
                socketsWorkflowMap.set(socketId, 10);
                // Extract ingredients of Recipes with Portions & Units
                responseMessage = prepareMessage(10, rcpList, recipeCorpus, data.text);
                return responseMessage;
            case 10:
                socketsWorkflowMap.set(socketId, 11);
                // Extract Recipes
                responseMessage = prepareMessage(11, rcpList, recipeCorpus, data.text);
                return responseMessage;

            case 11:
                socketsWorkflowMap.set(socketId, 12);
                responseMessage = prepareMessage(12, rcpList, recipeCorpus, data.text);
                return responseMessage;

            case 12:
                socketsWorkflowMap.set(socketId, 1);
                // Extract Recipes
                responseMessage = prepareMessage(1, rcpList, recipeCorpus, data.text);
                return responseMessage;
        }// Switch End
    }

    socket.on("message", data => {
        let replyto = socket.id;
        // Message to be displayed
        responseMessage = processWorkFlow(socketsWorkflowMap, replyto, data);
        socketIO.to(replyto).emit("messageResponse", {
            text: responseMessage,
            name: "AI Agent",
            id: data.id,
            socketID: data.socketID
        })

    }); //W/F Message display
    socket.on('disconnect', () => {
        console.log('🔥: A user disconnected');
        //Remove logged in UserQA/c
        socketsWorkflowMap.delete(socket.id);
        //Removing disconnecting socket record
        socket.disconnect()
    });
})


http.listen(PORT, () => {
    console.log(`Server listening on ${PORT}`);
});
