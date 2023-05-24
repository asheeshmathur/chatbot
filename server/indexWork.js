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
        origin: "http://localhost:3000"
    }
});
// Instantiate Corpus
const myCorpus = new Corpus("./testCorpus1.json");
//To keep track of all connected users
let sockets = [];

app.use(cors())


// HashMap for all sockets and their details
let connectionsMap = new Map;


let users = []

socketIO.on('connection', (socket) => {
    console.log(`⚡: ${socket.id} user just connected!`)
    // Add its record in map, empty array to start with
    connectionsMap.set(socket.id,new Array());

    // Emit the connected users when a new socket connects
    let sock = socket.id;
    sockets.push(sock);

    // Welcome Message on establishing connection
    socketIO.emit("messageResponse", {
        text:"AI Agent : How Can I Help You",
        name: "AI Agent",
        id: "007",
        socketID: socketIO.id
    })

    //////
    socket.on("message", data => {
        //Instantiate Corpus
        let replyto=socket.id;
        console.log("Socket to be responded: "+socket.id);
        const extracted = myCorpus.extractIntentFromText(data.text);
        const dynamicMessage = myCorpus.randomAnswer(extracted);
        //Create an instance of Intent and Response
        const intentHistory = new IntentHistory(data.text,extracted,dynamicMessage);
        let newArray = connectionsMap.get(socket.id);
        newArray.push(intentHistory)
        connectionsMap.set(socket.id, newArray)

      socketIO.to(replyto).emit("messageResponse",
          {
          text:data.text,
          name: data.name,
          id: data.id,
          socketID: data.socketID
      })
        socketIO.to(replyto).emit('messageResponse',
            {text:dynamicMessage,
            name:data.name,
            io:data.id,
            socketIO:data.socketID});

    })

    socket.on("typing", data => (
      socket.broadcast.emit("typingResponse", data)
    ))

    socket.on("newUser", data => {
      users.push(data)
      socketIO.emit("newUserResponse", users)
    })
 
    socket.on('disconnect', () => {
      console.log('🔥: A user disconnected');
      users = users.filter(user => user.socketID !== socket.id)
      socketIO.emit("newUserResponse", users)
      socket.disconnect()
    });
});

app.get("/api", (req, res) => {
  res.json({message: "Hello"})
});

   
http.listen(PORT, () => {
    console.log(`Server listening on ${PORT}`);
});