// Import Corpus
const Corpus = require("./Singleton.js");
const IntentHistory = require("./IntentHistory.js");

const express = require("express")
const app = express()
const cors = require("cors")
const http = require('http').Server(app);
const PORT = 4000
const socketIO = require('socket.io')(http, {
    cors: {
        origin: "http://localhost:3000/",

        allowedHeaders: ["Access-Control-Allow-Origin"],
        handlePreflightRequest: (req, res) => {
            res.writeHead(200, {
                "Access-Control-Allow-Origin": "https://radhey.azurewebsites.net",
                "Access-Control-Allow-Methods": "GET,POST",
                "Access-Control-Allow-Headers": "Access-Control-Allow-Origin",
                "Access-Control-Allow-Credentials": true
            });
            res.end();
        }
    }


});
// Instantiate Corpus
const myCorpus = new Corpus("./testCorpus1.json");
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
        // Ping Back what user typed in
        socketIO.emit("messageResponse",
            {
                text: data.text,
                name: data.name,
                id: data.id,
                socketID: data.socketID
            })

    }); //message display

    socket.on("message", data => {
        let replyto=socket.id;
        console.log("Socket to be responded: "+socket.id);
        const extracted = myCorpus.extractIntentFromText(data.text);
        const dynamicMessage = myCorpus.randomAnswer(extracted);

        //Create an instance of Intent and Response
        const intentHistory = new IntentHistory(data.text,extracted,dynamicMessage);
        let newArray = connectionsMap.get(socket.id);
        newArray.push(intentHistory)
        connectionsMap.set(socket.id, newArray)
        socketIO.to(replyto).emit('messageResponse',
            {text:dynamicMessage,
                name: "AI Agent",
                id:data.id,
                socketIO:data.socketID});

    })
})
http.listen(PORT, () => {
    console.log(`Server listening on ${PORT}`);
});