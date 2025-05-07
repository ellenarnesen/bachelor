// src/components/Chatbot.jsx

// Import av nødvendige React-hooks og eksterne biblioteker
import React, { useState, useEffect, useRef } from "react";

// Import av prompter og initial melding for chatbotten
import {
  initialMessage,
  dynamicSystemPrompt,
  summaryPrompt,
} from "../data/chatbotPrompts";

// Import av stiler og ikoner
import "../styles/Chatbot.css";
import logo from "../media/logo.png";
import miniLogo from "../media/avatar.png";
import { IoClose } from "react-icons/io5";
import kryssIkon from "../media/kryssikon.png";

// Import av Supabase-klienten for databasetilgang
import { supabase } from "../supabaseClient";

// Import av hjelpefunksjoner for lagring av meldinger, bygging av samtaler osv.
import saveMessage from "../utils/saveMessage";
import buildConversationForGPT from "../utils/buildConversation";
import handleConsent from "../utils/handleConsent";
import copyToClipboard from "../utils/copyToClipboard";
import scrollToBottom from "../utils/scrollToBottom";
import finishChat from "../utils/finishChat";
import sendMessage from "../utils/sendMessage";
import startNewChat from "utils/startNewChat";
import restartChat from "../utils/restartChat";
import countUserMessages from "../utils/questionCounter"; // Importer funksjonen som teller brukerens meldinger

// Funksjonen for chatbot-komponenten
const Chatbot = () => {
  // State hooks for å lagre tilstanden til chatten
  const [messages, setMessages] = useState([{ sender: "bot", text: initialMessage },]);
  const [consent, setConsent] = useState(null); // Samtykke-status
  const [input, setInput] = useState(""); // Brukerens input
  const [loading, setLoading] = useState(false); // Indikerer om chatbotten laster
  const [isTyping, setIsTyping] = useState(false); // Indikerer om chatbotten skriver
  const [chatId, setChatId] = useState(null); // Chat ID for sesjonen
  const [chatEnded, setChatEnded] = useState(false); // Indikerer om chatten er avsluttet
  const [isFinishingChat, setIsFinishingChat] = useState(false); // Indikerer om chatten blir ferdig
  const [copySuccess, setCopySuccess] = useState(""); // Bekreftelse på kopiering
  const [hoverText, setHoverText] = useState("Klikk for å kopiere ID"); // Tekst for kopieringstips
  const [hoverXbottom, setHoverXbottom] = useState("Klikk for å avslutte samtalen og få en oppsummering"); // Tekst for avslutningstips

  // Referanser for å rulle til bunnen av chatten og for input-feltet
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  /*
  ------------------
  Hjelpefunksjoner: 
  */
  // Håndter samtykke direkte
  const handleConsentClick = (userConsent) => {
    handleConsent(
      userConsent,
      setConsent,
      setMessages,
      startNewChat,
      chatId,
      kryssIkon
    );
  };

  // Håndter avslutning av chat direkte
  const handleFinishChat = () => {
    if (userMessageCount >= 10) {
      finishChat(
        isFinishingChat,
        setIsFinishingChat,
        consent,
        chatId,
        messages,
        setMessages,
        setChatEnded,
        summaryPrompt
      );
    }
  };

  // Håndter sending av melding direkte
  const handleSendMessage = () => {
    sendMessage(
      input,
      setInput,
      setMessages,
      setLoading,
      setIsTyping,
      chatId,
      consent,
      messages,
      dynamicSystemPrompt,
      inputRef
    );
  };

  // Håndter kopiering av chat-ID til clipboard
  const handleCopyToClipboard = () => {
    copyToClipboard(chatId, setCopySuccess);
  };

  // Håndter restart av chat
  const handleRestartChat = () => {
    restartChat(
      setChatId,
      setConsent,
      setChatEnded,
      setIsFinishingChat,
      setMessages
    );
  };

    // Beregn antall meldinger fra brukeren
    const userMessageCount = countUserMessages(messages);
  /*
  ------------------
  useEffect Hooks:
  */
  // Starter ny chat når samtykke er gitt
  useEffect(() => {
    if (consent) {
      startNewChat(setChatId);
    }
  }, [consent]);
  // Scroller til bunnen av chatvinduet når nye meldinger legges til
  useEffect(() => {
    scrollToBottom(messagesEndRef);
    if (inputRef.current) inputRef.current.focus();
  }, [messages]);

  /*
  ------------------
  Funksjoner for håndtering av chat:
  */

  // Håndterer endringer i input-feltet, justerer høyde på textarea etter innhold
  const handleInputChange = (e) => {
    setInput(e.target.value);
    e.target.style.height = "30px";
    e.target.style.height = `${e.target.scrollHeight}px`;
  };

  // Håndterer blur (tap av fokus) på input-feltet
  const handleInputBlur = () => {
    document.activeElement.blur();
  };
  // --------------------
  // HTML-struktur for komponenten:
  return (
    <div className="chat-container">
      <header className="chat-header">
        <img src={logo} alt="MeyerHaugen" className="logo" />
        <p className="chat-date">
          {new Date().toLocaleDateString("no-NO", {
            weekday: "long",
            day: "numeric",
            month: "long",
          })}
        </p>
        {chatId && (
          <p
            className="chat-id"
            onClick={handleCopyToClipboard}
            title={hoverText}
            style={{ cursor: "pointer" }}
          >
            Chat ID:{" "}
            <span style={{ textDecoration: "underline" }}>{chatId}</span>
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
            <div className={`chat-bubble ${msg.sender}`}>
              {msg.jsx ? msg.jsx : msg.text}
            </div>
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
          <button className="restart-button" onClick={handleRestartChat}>
            Start ny samtale
          </button>
        </div>
      )}

      {consent === null && (
        <div className="consent-buttons">
          <button className="accept" onClick={() => handleConsentClick(true)}>
            Godta
          </button>
          <button
            className="decline"
            onClick={() => handleConsentClick(false)}
          >
            Avslå
          </button>
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
                if (!chatEnded) handleSendMessage();
              }
            }}
            onBlur={handleInputBlur}
            disabled={loading || chatEnded}
            rows={1}
            style={{
              resize: "none",
              minHeight: "30px",
              maxHeight: "200px",
              overflowY: "auto",
            }}
          />
          <button onClick={handleSendMessage} disabled={loading || chatEnded}>
            ➤
          </button>
          {!chatEnded && (
            <div className="chat-actions">
              {!isFinishingChat ? (
                <button
                  onClick={handleFinishChat}
                  title={
                    userMessageCount < 15
                      ? "Du må besvare minst 15 spørsmål før du kan avslutte chatten"
                      : hoverXbottom
                  }
                  disabled={isFinishingChat || userMessageCount < 15} // Deaktiver knappen hvis færre enn 10 meldinger
                  style={{
                    fontSize: "20px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "0.5rem",
                    lineHeight: "1",
                    opacity: userMessageCount < 15 ? 0.5 : 1, // Gjør knappen halvtransparent hvis den er deaktivert
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

// Eksporter komponenten for bruk i appen
export default Chatbot; // export til index.js