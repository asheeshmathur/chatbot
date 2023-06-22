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

function processUserIntents(uIntents,rCorpus){
    let answer=[];
    // Holds the Map of all queryable fields
    let qMap = new Map();

    let finalAnswer =""
    if (uIntents != null){
        uIntents.forEach(function (value) {
            answer =   intentCorpus.intentAnswer.get(value);
            for (let key in answer.query)
            {
                if (answer.query.hasOwnProperty(key))
                {
                    value = answer.query[key];
                    qMap.set(key,value);

                } // End If
            } // End for
            // Now iterate all recipes matching answer
            for (let i =0 ; rCorpus.corpus.length; i++){
                let matchCount = 0;
                let tVal ="";
                qMap.forEach(function(value, key) {
                    const fullMap = new Map(Object.entries((rCorpus.corpus[i])));
                    if (fullMap.has(key))
                    {
                        tVal = fullMap.get(key);
                        if (tVal == value){
                            matchCount++;
                        }
                    }

                })



            }

        });
        return finalAnswer;
    }


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
        let intentSet = new Map();

        intentSet = intentCorpus.extractIntentsFromText(data.text);
        console.log("Identified ",intentSet.keys());
        let ossd = "";
        if (intentSet.size > 0){
            intentIter = intentSet.values();
            let intents="";

            for (let i=0; i<intentSet.size; i++)
            {
                intents= intentIter.next().value+" ";

            }
            ossd= `Good ...we have ${intentSet.size} Recipes per 
            your choice.  `
        }

       // let ossd = processUserIntents(intentCorpus.extractIntentFromText(data.text),recipeCorpus);


        socketIO.to(replyto).emit("messageResponse",
            {
                text: ossd,
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
