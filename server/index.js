
var os = require('os');
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
let continuationFlag = false;

app.use(cors())

console.log(`Ready to Serve`);

// HashMap for all sockets and their details
let connectionsMap = new Map;


let users = []
let retAnswer ="";
let recipeId= -1;
let recipeDetails="";
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
    console.log(`⚡: ${socket.id} user just connected!`)
    // Add its record in map, empty array to start with
    connectionsMap.set(socket.id, new Array());

    // Emit the connected users when a new socket connects
    let sock = socket.id;
    sockets.push(sock);

    // Welcome Message on establishing connection
    socketIO.emit("messageResponse", {
        text: "Welcome To World of Exotic Recipes, Looking for some recipes. Can I Help find a one",
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
    let recipeDetails = "Recipe Details \n";
    let ingredientsDetails = "Ingredients \n";
    socket.on("message", data => {
        let replyto = socket.id;
        const extracted = myCorpus.extractRecipesFromText(data.text);
        let singleKeyFound=false;
        let retAnswer="";
        if (extracted.size > 1) {
            // check count of matches for
            for (let [key, value] of  extracted.entries()) {
                if (value >= 2){

                    retAnswerOne = key;
                    singleKeyFound=true;
                    continuationFlag = true;
                    break;

                }
                else{
                    // set continuation flag to false
                    continuationFlag=false;

                    retAnswer= "There are "+extracted.size+ " Dishes Available "
                    i = 1
                    for (const value of extracted) {
                        retAnswer = retAnswer+i+" "+value +".\n\n";
                        i++;
                    }
                    retAnswer=retAnswer+" Please Select One of these";
                }
            }

        }
        else {
            const iterator1 = extracted.keys();
            retAnswerOne=iterator1.next().value

            if (retAnswerOne == "general"){
                // We need to provide subsequent flag
                continuationFlag=false;
                retAnswer= "Sorry, could not find any matching Recipe, please try again"
            }
            else{
                // Single Unique Recipe Found
                // We need to provide subsequent flag
                continuationFlag=true;
                singleKeyFound=true;
                const iterator1 = extracted.keys();
                retAnswerOne= iterator1.next().value

            }

        }

        const intentHistory = new IntentHistory(data.text, extracted, extracted);
        let newArray = connectionsMap.get(socket.id);
        newArray.push(intentHistory)
        connectionsMap.set(socket.id, newArray)

        if (continuationFlag == true && singleKeyFound == true ){
            retAnswer = myCorpus.getIntentAnswers(retAnswerOne)
            recipeId= myCorpus.getRecipeId(retAnswerOne)
            recipeDetails = myCorpus.corpus[recipeId].recipeDescription;
            ingredientsDetails= parseIngredients(myCorpus.corpus[recipeId].recipeIngredients);
            socketIO.to(replyto).emit('messageResponse',
                {
                    text: retAnswer,
                    name: "AI Agent",
                    id: data.id,
                    socketIO: data.socketID
                });

            // Send  Recipe Details of the
            socketIO.to(replyto).emit('messageResponse',
                {
                    text: "Here's the Recipe",
                    name: "AI Agent",
                    id: data.id,
                    socketIO: data.socketID
                });
            socketIO.to(replyto).emit('messageResponse',
                {
                    text: "Recipe "+recipeDetails +"\r\n\t"+ingredientsDetails+ " ] ",
                    name: "AI Agent",
                    id: data.id,
                    socketIO: data.socketID
                });


        }
        else{
            socketIO.to(replyto).emit('messageResponse',
                {
                    text: retAnswer,
                    name: "AI Agent",
                    id: data.id,
                    socketIO: data.socketID
                });
        }

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
