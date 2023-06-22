var os = require('os');
const express = require("express")
const app = express()
const cors = require("cors")
const http = require('http').Server(app);
app.use(cors())

const PORT = 4000

const IntentHistoryItem = require("./IntentHistoryItem.js");
const IntentHistoryStack = require("./IntentHistoryStack.js");
const EventLogger = require("./EventLogger.js");

// Reference to Utterances and Intent Corpus
const IntentCorpus = require("./IntentCorpus.js");

// Reference to Recipe Corpus
const RecipeCorpus = require("./RecipeCorpus.js");

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

// Set continuation Message
const continuationMsg = "What Next , Please"

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
let recipeDetails="";


socketIO.on('connection', (socket) => {
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
    socketIO.emit("messageResponse", {
        text: recipeCorpus.welcomeMsg(),
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
        let intentMap = new Map();
        let recipes="";

        intentMap = intentCorpus.extractIntentsFromText(data.text);
        console.log("Identified ",intentMap.keys());
        recipes = "We have identified following Recipes ";
        if (intentMap.size > 0){
            recipes = "We have identified following Recipes ";
            for (let key of intentMap.keys()) {
                recipes= recipes+intentCorpus.intentRecipies.get(key);
            }

        }
        else{
            recipes = "Sorry, we could not identify any recipes matching your criteria, please refine search.";
        }

        socketIO.to(replyto).emit("messageResponse",
            {
                text: recipes,
                name: "AI Agent",
                id: data.id,
                socketID: data.socketID
            })
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
