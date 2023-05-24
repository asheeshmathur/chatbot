import React, { useEffect, useState, useRef} from 'react'
import ChatBar from './ChatBar'
import ChatBody from './ChatBody'
import ChatFooter from './ChatFooter'
import socketIO from "socket.io-client";
const socket = socketIO.connect("http://localhost:4000")

const ChatPage = () => {
  const [messages, setMessages] = useState([])
  const [typingStatus, setTypingStatus] = useState("")
  const lastMessageRef = useRef(null);
  // Call this function every time there's some change in messages or socket
  useEffect(()=> {
    socket.on("messageResponse", data => setMessages([...messages, data]))
  }, [messages])

    useEffect(()=> {
        socket.on("messageReplicate", data => setMessages([...messages, data]))
    }, [messages])

    useEffect(()=> {
    socket.on("typingResponse", data => setTypingStatus(data))
  }, [socket])

  useEffect(() => {
    // 👇️ scroll to bottom every time messages change
    lastMessageRef.current?.scrollIntoView({behavior: 'smooth'});
  }, [messages]);

  return (

    <div className="chat">

      <div className='chat__main'>
        <ChatBody messages={messages} typingStatus={typingStatus} lastMessageRef={lastMessageRef}/>
        <ChatFooter socket={socket}/>
      </div>
    </div>
  )
}

export default ChatPage