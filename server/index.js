var os = require('os');
// Import Corpus
const Corpus = require("./Singleton-I.js");

const IntentHistoryItem = require("./IntentHistoryItem.js");
const IntentHistoryStack = require("./IntentHistoryStack.js");
const EventLogger = require("./EventLogger");


const express = require("express")
const app = express()
const cors = require("cors")
const http = require('http').Server(app);
app.use(cors())

const PORT = 4000
const socketIO = require('socket.io')(http, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});

// Instantiate Corpus
const myCorpus = new Corpus("./data.json");

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

// Parse all ingredients
function parseIngredients(ingredientArray) {
    let text ="";
    for (let i = 0; i < ingredientArray.length; i++) {

           text += " "+ingredientArray[i].ingredient.ingredientName
           text += " "+ingredientArray[i].proportionValue + " - ";
           text += " "+ingredientArray[i].proportionUnit  + " |\n "+ os.EOL;

        }
    return text;
}


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
        text: myCorpus.welcomeMsg(),
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
        socketIO.to(replyto).emit("messageResponse",
            {
                text: myCorpus.getIntentFromText(data.text),
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
