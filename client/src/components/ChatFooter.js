import React, {useState} from 'react'

const ChatFooter = ({socket}) => {
    const [message, setMessage] = useState("")
    const handleTyping = () => socket.emit("typing",`${localStorage.getItem("userName")} is typing`)

    const handleSendMessage = (e) => {
        e.preventDefault()
                if(message.trim() ) {
                    // Emit Two Messages
                    socket.emit("messageDisplay",
                    {
                        text: message,
                        name: localStorage.getItem("userName"),
                        id: `${socket.id}${Math.random()}`,
                        socketID: socket.id

                    })
                    console.log("Sent Message Display Message")
                socket.emit("message",
                    {
                    text: message,
                    name: localStorage.getItem("userName"),
                    id: `${socket.id}${Math.random()}`,
                    socketID: socket.id
                    }
                )
                }
                //Cleans up message list
                setMessage("")


    }
  return (
    <div className='chat__footer'>
        <form className='form' onSubmit={handleSendMessage}>
          <input 
            type="text" 
            placeholder='Write message' 
            className='message' 
            value={message} 
            onChange={e => setMessage(e.target.value)}
            onKeyDown={handleTyping}
            />
            <button className="sendBtn">SEND</button>
        </form>
     </div>
  )
}

export default ChatFooter