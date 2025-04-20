// src/components/Chatbot.jsx
import React, { useState, useEffect, useRef } from "react";
import {
  initialMessage,
  dynamicSystemPrompt,
  summaryPrompt,
} from "../data/chatbotPrompts";
import "../styles/Chatbot.css";
import logo from "../media/logo.png";
import miniLogo from "../media/avatar.png";
import { IoClose } from "react-icons/io5";
import { supabase } from "../supabaseClient";
import kryssIkon from "../media/kryssikon.png";
import saveMessage from "../utils/saveMessage";
import buildConversationForGPT from "../utils/buildConversation";
import handleConsent from "../utils/handleConsent";
import copyToClipboard from "../utils/copyToClipboard";
import scrollToBottom from "../utils/scrollToBottom";
import finishChat from "../utils/finishChat";
import sendMessage from "../utils/sendMessage";
import startNewChat from "utils/startNewChat";

// Importer nødvendige funksjoner og komponenter
const Chatbot = () => {
  const [messages, setMessages] = useState([
    { sender: "bot", text: initialMessage },
  ]);
  const [consent, setConsent] = useState(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [chatId, setChatId] = useState(null);
  const [chatEnded, setChatEnded] = useState(false);
  const [isFinishingChat, setIsFinishingChat] = useState(false);
  const [copySuccess, setCopySuccess] = useState("");
  const [hoverText, setHoverText] = useState("Klikk for å kopiere ID");
  const [hoverXbottom, setHoverXbottom] = useState("Klikk for å avslutte samtalen og få en oppsummering");

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  
  //
  useEffect(() => {
    if (consent) {
      startNewChat(setChatId);
    }
  }, [consent]);

  const startNewChat = async () => {
    try {
      const { data, error } = await supabase
        .from("chats")
        .insert([{ status: "active" }])
        .select()
        .single();

      if (error) throw error;

      setChatId(data.id);
      console.log("Ny samtale startet med ID:", data.id);
    } catch (error) {
      console.error("Feil ved oppstart av chat:", error);
    }
  };

  // Flytt handleConsentWrapper inn i Chatbot-komponenten
  const handleConsentWrapper = (userConsent) => {
    handleConsent(userConsent, setConsent, setMessages, startNewChat, chatId, kryssIkon);
  };
  
  // Funksjon som skroller til bunnen av chatten
  useEffect(() => {
    scrollToBottom(messagesEndRef);
    if (inputRef.current) inputRef.current.focus();
  }, [messages]);


  // Funksjon for å håndtere sending av melding
  const handleSendMessage = () => {
    sendMessage(input, setInput, setMessages, setLoading, setIsTyping, chatId, consent, messages, dynamicSystemPrompt, inputRef);
  };

  // Funksjon for å håndtere avslutning av chatten
  const finishChatWrapper = () => {
    finishChat(isFinishingChat, setIsFinishingChat, consent, chatId, messages, setMessages, setChatEnded, summaryPrompt);
  };

  // Funksjon for restarte chatten
  const restartChat = async () => {
    setChatId(null);
    setConsent(null);
    setChatEnded(false);
    setIsFinishingChat(false);
    setMessages([{ sender: "bot", text: initialMessage }]);
    startNewChat();
  };


  // Funksjon for å håndtere endringer i inputfeltet
  // Setter høyden på inputfeltet basert på innholdet
  const handleInputChange = (e) => {
    setInput(e.target.value);
    e.target.style.height = "30px";
    e.target.style.height = `${e.target.scrollHeight}px`;
  };

  // Funksjon for å håndtere kopiering ved trykk av chat ID
  const handleCopyToClipboard = () => {
    copyToClipboard(chatId, setCopySuccess);
  };

  // Funksjon som gjør at brukeren ikke kan skrive på inputfeltet når det genereres svar fra chatboten
  const handleInputBlur = () => {
    document.activeElement.blur(); // Fjern fokus fra inputfeltet
  };

  return (
    <div className="chat-container">
      <header className="chat-header">
        <img src={logo} alt="MeyerHaugen" className="logo" />
        <p className="chat-date">
          {new Date().toLocaleDateString("no-NO", { weekday: "long", day: "numeric", month: "long" })}
        </p>
        {chatId && (
          <p
            className="chat-id"
            onClick={handleCopyToClipboard}
            title={hoverText}
            style={{ cursor: "pointer" }}
          >
            Chat ID: <span style={{textDecoration: "underline" }}>{chatId}</span> 
          </p>
        )}
      </header>

      <div className="chatbot-messages">
        {messages.map((msg, i) => (
          <div key={i} className={`chat-message ${msg.sender}`}>
            {msg.sender === "bot" ? (
              i === messages.length - 1 ? (
                <img src={miniLogo} alt="Bot" className="bot-avatar" />
              ) : (
                <div className="bot-avatar-placeholder"></div>
              )
            ) : null}
            <div className={`chat-bubble ${msg.sender}`}>{msg.jsx ? msg.jsx : msg.text}</div>
          </div>
        ))}

        {isTyping && (
          <div className="typing-bubble">
            <span></span>
            <span></span>
            <span></span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {chatEnded && (
        <div className="restart-chat">
          <button className="restart-button" onClick={restartChat}>
                Start ny samtale
          </button>
        </div>
      )}

      {consent === null && (
        <div className="consent-buttons">
          <button className="accept" onClick={() => handleConsentWrapper(true)}>Godta</button>
          <button className="decline" onClick={() => handleConsentWrapper(false)}>Avslå</button>
        </div>
      )}

      {consent !== null && (
        <div className="chat-input">
          <textarea
            ref={inputRef}
            placeholder="Skriv melding her"
            value={input}
            onChange={handleInputChange}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (!chatEnded) handleSendMessage(); // Kun send hvis chat ikke er avsluttet
              }
            }}
            onBlur={handleInputBlur} // Koble til funksjonen
            disabled={loading || chatEnded} // Deaktivert hvis chat er avsluttet
            rows={1}
            style={{ resize: "none", minHeight: "30px", maxHeight: "200px", overflowY: "auto" }}
          />
          <button onClick={handleSendMessage} disabled={loading || chatEnded}>
            ➤
          </button>
          {!chatEnded && (
            <div className="chat-actions">
              {!isFinishingChat ? (
                <button 
                  onClick={finishChatWrapper} 
                  title={hoverXbottom}
                  disabled={isFinishingChat} 
                  style={{ 
                    fontSize: "20px", 
                    display: "flex", 
                    alignItems: "center", 
                    justifyContent: "center", 
                    padding: "0.5rem", 
                    lineHeight: "1" 
                  }}
                >
                  <IoClose style={{ fontSize: "inherit" }} />
                </button>
              ) : (
                <div className="spinner">
                  <img src={miniLogo} alt="Laster oppsummering..." />
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Chatbot;