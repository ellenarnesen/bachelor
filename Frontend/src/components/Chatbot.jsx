// src/components/Chatbot.jsx
import React, { useState, useEffect, useRef } from "react";
import {
  initialMessage,
  dynamicSystemPrompt,
  summaryPrompt,
} from "../data/chatbotPrompts";
import "../styles/Chatbot.css";
import { askChatbot } from "../utils/langchainChatbot";
import logo from "../media/logo.png";
import miniLogo from "../media/MH_logo.png";
import { IoClose } from "react-icons/io5";
import { supabase } from "../supabaseClient";
import kryssIkon from "../media/kryssikon.png";
import saveMessage from "../utils/saveMessage";
import buildConversationForGPT from "../utils/buildConversation";

// Bruker miljøvariabel for API-kall
const apiBaseUrl = process.env.REACT_APP_API_BASE_URL;

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

  useEffect(() => {
    if (consent) {
      startNewChat();
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
      console.log("✅ Ny samtale startet med ID:", data.id);
    } catch (error) {
      console.error("❌ Feil ved oppstart av chat:", error);
    }
  };

  useEffect(() => {
    scrollToBottom();
    if (inputRef.current) inputRef.current.focus();
  }, [messages]);

  const handleConsent = async (userConsent) => {
    setConsent(userConsent);

    const userMsg = {
      sender: "user",
      text: userConsent
        ? "Ja, jeg samtykker."
        : "Nei, jeg ønsker ikke lagring.",
    };
    const botMsg1 = {
      sender: "bot",
      jsx: (
        <>
          Den er grei😊 La oss først bli litt kjent, før vi ser på hvordan situasjonen din er i dag.
          Deretter utforsker vi hva som motiverer deg og gir deg mening, med inspirasjon fra Ikigai - en japansk metode. 
          Ved å trykke { " " }  <img src={kryssIkon} alt="kryss" style={{ width: "20px", verticalAlign: "middle" }} />
          { " " }, vil du få en oppsummering av samtalen vår.
          Du kan avslutte samtalen når du vil, men for best utbytte anbefaler vi å ta deg tid.
        </>
      ),
    };

    const botMsg2 = {
      sender: "bot",
      text: " Men først! Mitt navn er SoftAi, hva heter du?"
    };

    setMessages((prev) => [...prev, userMsg, botMsg1, botMsg2]);

    if (userConsent) {
      await startNewChat();
      saveMessage(chatId, userConsent, userMsg);
      saveMessage(chatId, userConsent, botMsg1);
      saveMessage(chatId, userConsent, botMsg2);
    }
  };

  const sendMessage = async () => {
    if (!input.trim()) return;
    setLoading(true);

    const userMessage = { sender: "user", text: input.trim() };
    setMessages((prev) => [...prev, userMessage]);
    saveMessage(chatId, consent, userMessage);
    setInput("");
    inputRef.current.style.height = "30px";

    setIsTyping(true);

    setTimeout(async () => {
      let botReply = "";
      const conversationMessages = buildConversationForGPT([
        ...messages,
        userMessage,
      ]);

      botReply = await askChatbot(conversationMessages, dynamicSystemPrompt);

      setMessages((prev) => [...prev, { sender: "bot", text: botReply }]);
      saveMessage(chatId, consent, { sender: "bot", text: botReply });

      setIsTyping(false);
      setLoading(false);
    }, 500);
  };

  const finishChat = async () => {
    if (isFinishingChat) return; // Forhindrer flere kall
    setIsFinishingChat(true);

    try {
      if (consent !== false && chatId) {
        // Oppdater samtalestatus i databasen
        const { error } = await supabase
          .from("chats")
          .update({ status: "finished" })
          .eq("id", chatId);

        if (error) throw error;
      }

      // Bygg samtalen for oppsummering
      const conversationMessages = buildConversationForGPT(messages);

      // Bruk summaryPrompt fra chatbotPrompts.js
      const summary = await askChatbot(conversationMessages, summaryPrompt);

      // Legg til oppsummeringen som en melding fra boten
      const summaryMessages = [
        { sender: "bot", text: "Her er en oppsummering av samtalen:" },
        { sender: "bot", text: summary },
        { sender: "bot", text: "Takk for samtalen!😊 Ha en fin dag videre!\nHvis du vil starte på nytt, trykk på knappen nedenfor 👇" },
      ];

      setMessages((prev) => [...prev, ...summaryMessages]);

      // Lagre oppsummeringen i databasen
      for (const message of summaryMessages) {
        await saveMessage(chatId, consent, message);
      }

      setChatEnded(true); // Marker samtalen som avsluttet
    } catch (error) {
      console.error("❌ Feil ved oppdatering av samtalestatus eller oppsummering:", error);
    } finally {
      setIsFinishingChat(false); // Skjul spinneren når prosessen er ferdig
    }
  };

  const restartChat = async () => {
    setChatId(null);
    setConsent(null);
    setChatEnded(false);
    setIsFinishingChat(false);
    setMessages([{ sender: "bot", text: initialMessage }]);
    startNewChat();
  };

  const scrollToBottom = () => {
    if (messagesEndRef.current)
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
  };

  const handleInputChange = (e) => {
    setInput(e.target.value);
    e.target.style.height = "30px";
    e.target.style.height = `${e.target.scrollHeight}px`;
  };

  const copyToClipboard = () => {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      navigator.clipboard.writeText(chatId)
        .then(() => {
          setCopySuccess("Chat-ID kopiert!");
          setTimeout(() => setCopySuccess(""), 2000);
        })
        .catch((err) => {
          console.error("Feil ved kopiering av Chat-ID:", err);
        });
    } else {
      console.warn("Clipboard API ikke tilgjengelig.");
    }
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
            onClick={copyToClipboard}
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
          <button className="accept" onClick={() => handleConsent(true)}>Godta</button>
          <button className="decline" onClick={() => handleConsent(false)}>Avslå</button>
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
                if (!chatEnded) sendMessage(); // Kun send hvis chat ikke er avsluttet
              }
            }}
            disabled={loading || chatEnded} // Deaktivert hvis chat er avsluttet
            rows={1}
            style={{ resize: "none", minHeight: "30px", maxHeight: "200px", overflowY: "auto" }}
          />
          <button onClick={sendMessage} disabled={loading || chatEnded}>
            ➤
          </button>
          {!chatEnded && (
            <div className="chat-actions">
              {!isFinishingChat ? (
                <button 
                  onClick={finishChat} 
                  title={hoverXbottom}
                  disabled={isFinishingChat} // Deaktiver knappen etter første trykk
                >
                  <IoClose />
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