import React from 'react'
import {useNavigate} from "react-router-dom"

const MsgContainer = ({messages, typingStatus, lastMessageRef}) => {
    const navigate = useNavigate()

    return (
        <>
            <header className='Header'>
                <p>Welcome To Recipe Cornucopia</p>
            </header>
            <header className='HeaderII'>
                Special Key Presses in Our Explorations<br/>
                'q' |'Q'  : Unable to Find Matching Recipes of Choice<br/>
                'c' | 'C' : Continue Journey ...
            </header>


            <div className='container'>
                {messages.map(message => (
                    message.name === localStorage.getItem("userName") ? (
                        <div className="chat_message" key={message.id}>
                            <p className='you'>You</p>
                            <div className='message__sender'>
                                <p>{message.text}</p>
                            </div>
                        </div>
                    ): (
                        <div className="chat_message" key={message.id}>
                            <p className='ai_agent'>{message.name}</p>
                            <div className='message_receiver'>
                                <p>{message.text}</p>
                            </div>
                        </div>
                    )
                ))}

                <div className='status'>
                    <p>{typingStatus}</p>
                </div>
                <div ref={lastMessageRef} />
            </div>
        </>
    )
}

export default MsgContainer