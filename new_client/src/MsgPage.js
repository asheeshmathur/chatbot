import React, { useEffect, useState, useRef} from 'react'
import MsgContainer from './MsgContainer'
import MsgSender from './MsgSender'
import socketIO from "socket.io-client";
const socket = socketIO();

const MsgPage = () => {
  const [messages, setMessages] = useState([])
  const [typingStatus, setTypingStatus] = useState("")
  const lastMessageRef = useRef(null);

  // Call this function every time there's some change in messages or socket
  useEffect(()=> {
    socket.on("messageResponse", data =>
    {
      setMessages([...messages, data]);
    }, function(){
      console.log("About to Send Acknowledgement");
      socket.emit("sendContMesg","Oye Oye");
    })
  }, [messages])

  // Call this function every time there's some change in messages or socket
  useEffect(()=> {
    console.log("Cont Message Received");
    socket.on("messageResponseCont", data => setMessages([...messages, data]))
  }, [messages])

  // Call this function every time there's some change in messages or socket
  useEffect(()=> {
    socket.on("errorMessageResponse", data => setMessages([...messages, data]))
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
        <MsgContainer messages={messages} typingStatus={typingStatus} lastMessageRef={lastMessageRef}/>
        <MsgSender socket={socket}/>
      </div>
    </div>
  )
}

export default MsgPage
