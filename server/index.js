// Import Corpus
const Corpus = require("./Singleton-I.js");

const IntentHistory = require("./IntentHistory.js");

const express = require("express")
const app = express()
const cors = require("cors")
const http = require('http').Server(app);
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

app.use(cors())

console.log(`Ready to Serve`);

// HashMap for all sockets and their details
let connectionsMap = new Map;


let users = []

socketIO.on('connection', (socket) => {
    console.log(`⚡: ${socket.id} user just connected!`)
    // Add its record in map, empty array to start with
    connectionsMap.set(socket.id, new Array());

    // Emit the connected users when a new socket connects
    let sock = socket.id;
    sockets.push(sock);

    // Welcome Message on establishing connection
    socketIO.emit("messageResponse", {
        text: "How Can I Help You",
        name: "AI Agent",
        id: "007",
        socketID: socketIO.id
    })

    socket.on("messageDisplay", data => {
        console.log("Socket to be responded: " + socket.id);
        let replyto = socket.id;
        // Ping Back what user typed in
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
        console.log("Socket to be responded: " + socket.id);
        const extracted = myCorpus.extractRecipesFromText(data.text);
        retAnswer="";
        if (extracted.size > 1) {
            retAnswer= "There are "+extracted.size+ " Dishes Available "
            i =1
            for (const value of extracted) {
                retAnswer = retAnswer+i+" "+value +".\n\n";
                i++;
            }
            retAnswer=retAnswer+" Please Select One of these";

        }
        else {
            const iterator1 = extracted.values();

            retAnswerOne=iterator1.next().value
            retAnswer = myCorpus.getIntentAnswers(retAnswerOne)
            console.log(retAnswer)
        }

        //const dynamicMessage = myCorpus.randomAnswer(extracted);

        //Create an instance of Intent and Response
        //const intentHistory = new IntentHistory(data.text, extracted, dynamicMessage);
        const intentHistory = new IntentHistory(data.text, extracted, extracted);
        let newArray = connectionsMap.get(socket.id);
        newArray.push(intentHistory)
        connectionsMap.set(socket.id, newArray)
        socketIO.to(replyto).emit('messageResponse',
            {
                text: retAnswer,
                name: "AI Agent",
                id: data.id,
                socketIO: data.socketID
            });
        // Send continuation message

    })
    socket.on('disconnect', () => {
        console.log('🔥: A user disconnected');
        users = users.filter(user => user.socketID !== socket.id)
        socketIO.emit("newUserResponse", users)
        socket.disconnect()
    });
})
http.listen(PORT, () => {
    console.log(`Server listening on ${PORT}`);
});